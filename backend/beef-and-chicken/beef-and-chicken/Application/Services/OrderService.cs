using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using System.Net.NetworkInformation;
using Microsoft.AspNetCore.Http.Features;

namespace beef_and_chicken.Application.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IMenuRepository _menuRepo;
        private readonly IAddressRepository _addressRepo;
        private readonly ILogger<OrderService> _logger;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IDishOptionRepository _dishOptionRepo;
        private readonly UserManager<User> _userManager;
        private readonly IOrderNotificationService _orderNotificationService;

        public OrderService(
            IOrderRepository orderRepo,
            IMenuRepository menuRepo,
            IAddressRepository addressRepo,
            IDishOptionRepository dishOptionRepo,
            UserManager<User> userManager,
            ILogger<OrderService> logger,
            IMapper mapper,
            IUnitOfWork unitOfWork,
            IOrderNotificationService orderNotificationService)
        {
            _orderRepo = orderRepo;
            _menuRepo = menuRepo;
            _addressRepo = addressRepo;
            _dishOptionRepo = dishOptionRepo;
            _userManager = userManager;
            _logger = logger;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
            _orderNotificationService = orderNotificationService;
        }

        private const int FreeSideDishCount = 4;
        private const decimal ExtraSideDishPrice = 50m;

        public async Task<IEnumerable<OrderDetailsDto>> GetCustomerOrders(int userId, CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetAllCustomerOrders(userId, ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        /// OBAVEZNO: Vratiti se ovde pogledati metodu i prepraviti je
        public async Task<Order?> GetCustomerOrderById(int userId, int orderId, CancellationToken ct = default)
        {
            var order = await _orderRepo.GetCustomerOrderById(userId, orderId, ct);

            if (order == null)
            {
                _logger.LogInformation("Porudžbina sa ID-jem {OrderId} ne postoji!", orderId);
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");
            }

            return _mapper.Map<Order>(order);
        }

        public async Task<OrderDetailsDto> GetOrderById(int userId, int orderId, CancellationToken ct  = default)
        {
            var order = await _orderRepo.GetCustomerOrderById(userId, orderId, ct);
             
            if (order == null)
            {
                _logger.LogInformation("Porudžbina sa ID-jem {OrderId} ne postoji!", orderId);
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");
            }

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> CreateOrderAsync(
    int userId,
    CreateOrderRequestDto orderDto,
    CancellationToken ct = default)
        {
            if (orderDto is null)
                throw new BadRequestException("Podaci za porudžbinu su obavezni.");

            if (orderDto.Items is null || !orderDto.Items.Any())
                throw new BadRequestException("Porudžbina mora imati bar jednu stavku.");

            if (orderDto.Items.Any(i => i.DishId <= 0))
                throw new BadRequestException("Svaka stavka mora imati validan DishId.");

            if (orderDto.Items.Any(i => i.Quantity <= 0))
                throw new BadRequestException("Količina mora biti veća od 0.");

            if (orderDto.CustomerAddressId <= 0)
                throw new BadRequestException("Adresa za dostavu je obavezna.");

            var allSelectedOptionIds = orderDto.Items
                .SelectMany(i => i.SelectedOptionIds ?? new List<int>())
                .ToList();

            if (allSelectedOptionIds.Any(id => id <= 0))
                throw new BadRequestException("Izabrane opcije moraju imati validan ID.");

            const decimal deliveryFee = 200m;

            var address = await _addressRepo.GetCustomerAddressAsync(
                userId,
                orderDto.CustomerAddressId,
                ct
            );

            if (address == null)
            {
                throw new NotFoundException(
                    $"Adresa sa ID-jem {orderDto.CustomerAddressId} nije pronađena za korisnika sa ID-jem {userId}."
                );
            }

            var dishIds = orderDto.Items
                .Select(x => x.DishId)
                .Distinct()
                .ToList();

            var dishes = (await _menuRepo.GetByIdsAsync(dishIds, ct)).ToList();

            if (dishes.Count != dishIds.Count)
            {
                var foundIds = dishes.Select(d => d.Id).ToHashSet();
                var missingIds = dishIds.Where(id => !foundIds.Contains(id)).ToList();

                throw new NotFoundException(
                    $"Neka jela ne postoje ili nisu aktivna. Missing DishId: {string.Join(", ", missingIds)}"
                );
            }

            var dishById = dishes.ToDictionary(d => d.Id);

            var uniqueOptionIds = allSelectedOptionIds
                .Distinct()
                .ToList();

            var dishOptions = uniqueOptionIds.Count == 0
                ? new List<DishOption>()
                : await _dishOptionRepo.GetActiveByIdsAsync(uniqueOptionIds, ct);

            if (dishOptions.Count != uniqueOptionIds.Count)
            {
                var foundOptionIds = dishOptions.Select(x => x.Id).ToHashSet();
                var missingOptionIds = uniqueOptionIds
                    .Where(id => !foundOptionIds.Contains(id))
                    .ToList();

                throw new NotFoundException(
                    $"Neke opcije ne postoje ili nisu aktivne. Missing OptionId: {string.Join(", ", missingOptionIds)}"
                );
            }

            var optionById = dishOptions.ToDictionary(x => x.Id);

            var order = new Order
            {
                CustomerId = userId,
                CustomerAddressId = orderDto.CustomerAddressId,
                CreatedAt = DateTime.UtcNow,
                Notes = string.IsNullOrWhiteSpace(orderDto.Notes)
                    ? null
                    : orderDto.Notes.Trim(),
                DeliveryAddress = new OrderAddressSnapshot
                {
                    Street = address.Street,
                    HouseNumber = address.HouseNumber,
                    PostalCode = address.PostalCode,
                    City = address.City,
                    Label = address.Label,
                    Note = address.Note,
                },
                Status = OrderStatus.Na_Cekanju,
                DeliveryFee = deliveryFee
            };

            foreach (var requestedItem in orderDto.Items)
            {
                var dish = dishById[requestedItem.DishId];

                var selectedOptionIds = (requestedItem.SelectedOptionIds ?? new List<int>())
                    .Distinct()
                    .ToList();

                var selectedOptions = selectedOptionIds
                    .Select(id => optionById[id])
                    .ToList();

                var optionSnapshots = BuildOrderItemOptions(
                    selectedOptions,
                    out var optionsTotal
                );

                var orderItem = new OrderItem
                {
                    DishId = dish.Id,
                    DishName = dish.Name,
                    Quantity = requestedItem.Quantity,
                    UnitPrice = dish.Price,
                    OptionsTotal = optionsTotal,
                    Options = optionSnapshots
                };

                order.OrderItems.Add(orderItem);
            }

            order.Subtotal = order.OrderItems.Sum(x =>
                (x.UnitPrice + x.OptionsTotal) * x.Quantity
            );

            order.TotalAmount = order.Subtotal + order.DeliveryFee;

            var createdOrder = await _orderRepo.CreateOrder(order, ct);

            await _unitOfWork.SaveChangesAsync(ct);

            createdOrder.OrderNumber = GenerateOrderNumber(
                createdOrder.Id,
                createdOrder.CreatedAt
            );

            await _unitOfWork.SaveChangesAsync(ct);

            await _orderNotificationService.NotifyOrderChangedAsync(
                createdOrder,
                "OrderCreated",
                ct
            );

            var fullOrder = await _orderRepo.GetCustomerOrderById(
                userId,
                createdOrder.Id,
                ct
            );

            if (fullOrder == null)
            {
                throw new NotFoundException(
                    $"Porudžbina sa ID-jem {createdOrder.Id} nije pronađena nakon kreiranja."
                );
            }

            _logger.LogInformation(
                "Porudžbina sa ID-jem {OrderId} je uspešno kreirana.",
                createdOrder.Id
            );

            return _mapper.Map<OrderDetailsDto>(fullOrder);
        }

        private static List<OrderItemOption> BuildOrderItemOptions(
            List<DishOption> selectedOptions,
            out decimal optionsTotal)
        {
            var result = new List<OrderItemOption>();

            var regularSideDishes = selectedOptions
                .Where(x => x.Type == DishOptionType.SideDish && !x.IsAlwaysPaid)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToList();

            var alwaysPaidSideDishes = selectedOptions
                .Where(x => x.Type == DishOptionType.SideDish && x.IsAlwaysPaid)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToList();

            var spices = selectedOptions
                .Where(x => x.Type == DishOptionType.Spice)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToList();

            for (var i = 0; i < regularSideDishes.Count; i++)
            {
                var option = regularSideDishes[i];

                var unitPrice = i < FreeSideDishCount
                    ? 0m
                    : ExtraSideDishPrice;

                result.Add(new OrderItemOption
                {
                    DishOptionId = option.Id,
                    OptionName = option.Name,
                    OptionType = option.Type,
                    UnitPrice = unitPrice
                });
            }

            foreach (var option in alwaysPaidSideDishes)
            {
                result.Add(new OrderItemOption
                {
                    DishOptionId = option.Id,
                    OptionName = option.Name,
                    OptionType = option.Type,
                    UnitPrice = option.Price
                });
            }

            foreach (var option in spices)
            {
                result.Add(new OrderItemOption
                {
                    DishOptionId = option.Id,
                    OptionName = option.Name,
                    OptionType = option.Type,
                    UnitPrice = 0m
                });
            }

            optionsTotal = result.Sum(x => x.UnitPrice);

            return result;
        }

        public Task AcceptOrderAsync(int orderId, CancellationToken ct = default)
            => UpdateOrderStatus(orderId, OrderStatus.Prihvacena, ct);

        public Task RejectOrderAsync(int orderId, CancellationToken ct = default)
            => UpdateOrderStatus(orderId, OrderStatus.Odbijena, ct);

        public async Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default)
        {
            var pendingOrders = await _orderRepo.GetPendingOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(pendingOrders);
        }

        private async Task UpdateOrderStatus(
            int orderId,
            OrderStatus newStatus,
            CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            EnsureValidStatusTransition(order.Status, newStatus);

            order.Status = newStatus;

            await _unitOfWork.SaveChangesAsync(ct);

            await _orderNotificationService.NotifyOrderChangedAsync(
                order,
                "OrderUpdated",
                ct
            );

            _logger.LogInformation(
                "Status porudžbine {OrderId} promenjen u {Status}.",
                orderId,
                newStatus
            );
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetActiveOrdersAsync(
            CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetActiveOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        public async Task<OrderDetailsDto> AssignCourierAsync(
            int orderId,
            AssignCourierDto dto,
            CancellationToken ct = default)
        {
            if (dto.CourierId <= 0)
                throw new BadRequestException("CourierId mora biti validan.");

            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            if (order.Status != OrderStatus.Prihvacena)
                throw new BadRequestException("Kurir se može dodeliti samo prihvaćenoj porudžbini.");

            var courier = await _userManager.FindByIdAsync(dto.CourierId.ToString());

            if (courier == null)
                throw new NotFoundException($"Kurir sa ID-jem {dto.CourierId} nije pronađen.");

            var isCourier = await _userManager.IsInRoleAsync(courier, AppRoles.Courier);

            if (!isCourier)
                throw new BadRequestException("Izabrani korisnik nema Courier rolu.");

            order.CourierId = courier.Id;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Porudžbini {OrderId} je dodeljen kurir {CourierId}.",
                orderId,
                courier.Id
            );

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> MarkReadyForPickupAsync(int orderId, CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            EnsureValidStatusTransition(
                order.Status,
                OrderStatus.Spremna_za_preuzimanje
            );

            order.Status = OrderStatus.Spremna_za_preuzimanje;

            await _unitOfWork.SaveChangesAsync(ct);

            await _orderNotificationService.NotifyOrderChangedAsync(
                order,
                "OrderReadyForPickup",
                ct
            );

            _logger.LogInformation(
                "Porudžbina {OrderId} je označena kao spremna za preuzimanje.",
                orderId
            );

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetReadyForPickupOrdersAsync(CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetReadyForPickupOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetCourierOrdersAsync(int courierId, CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetCourierOrders(courierId, ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        public async Task<OrderDetailsDto> StartDeliveryAsync(
            int courierId,
            int orderId,
            CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            EnsureValidStatusTransition(
                order.Status,
                OrderStatus.Dostava_u_toku
            );

            order.CourierId = courierId;
            order.Status = OrderStatus.Dostava_u_toku;

            await _unitOfWork.SaveChangesAsync(ct);

            await _orderNotificationService.NotifyOrderChangedAsync(
                order,
                "OrderDeliveryStarted",
                ct
            );

            _logger.LogInformation(
                "Kurir {CourierId} je pokrenuo dostavu za porudžbinu {OrderId}.",
                courierId,
                orderId
            );

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> MarkPickedUpAsync(
            int courierId,
            int orderId,
            CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            if (order.CourierId != courierId)
                throw new BadRequestException("Ova porudžbina nije dodeljena ovom kuriru.");

            EnsureValidStatusTransition(order.Status, OrderStatus.Dostava_u_toku);

            order.Status = OrderStatus.Dostava_u_toku;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Kurir {CourierId} je preuzeo porudžbinu {OrderId}.",
                courierId,
                orderId
            );

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> MarkDeliveredAsync(
            int courierId,
            int orderId,
            CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderByIdForUpdate(orderId, ct);

            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            if (order.CourierId != courierId)
                throw new BadRequestException("Ova porudžbina nije dodeljena ovom kuriru.");

            EnsureValidStatusTransition(
                order.Status,
                OrderStatus.Dostavljena
            );

            order.Status = OrderStatus.Dostavljena;

            await _unitOfWork.SaveChangesAsync(ct);

            await _orderNotificationService.NotifyOrderChangedAsync(
                order,
                "OrderDelivered",
                ct
            );

            _logger.LogInformation(
                "Kurir {CourierId} je označio porudžbinu {OrderId} kao dostavljenu.",
                courierId,
                orderId
            );

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<PagedResultDto<OrderDetailsDto>> GetOrderHistoryAsync(
            OrderHistoryQueryDto query,
            CancellationToken ct = default)
        {
            query.Page = query.Page < 1 ? 1 : query.Page;
            query.PageSize = query.PageSize < 1 ? 20 : Math.Min(query.PageSize, 100);

            var result = await _orderRepo.GetOrderHistoryAsync(query, ct);

            return new PagedResultDto<OrderDetailsDto>
            {
                Items = _mapper.Map<List<OrderDetailsDto>>(result.Items),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = result.TotalCount
            };
        }

        public async Task<IEnumerable<OrderDetailsDto>> StartDeliveryBatchAsync(
            int courierId,
            StartDeliveryBatchRequestDto dto,
            CancellationToken ct = default)
        {
            var orderIds = dto.OrderIds
                .Distinct()
                .ToList();

            if (orderIds.Count == 0)
                throw new BadRequestException("Moraš izabrati bar jednu porudžbinu.");

            if (orderIds.Count > 10)
                throw new BadRequestException("Ne možeš pokrenuti više od 10 dostava odjednom.");

            var orders = await _orderRepo.GetOrdersByIdsForUpdateAsync(orderIds, ct);

            if (orders.Count != orderIds.Count)
                throw new NotFoundException("Jedna ili više porudžbina nisu pronađene.");

            foreach (var order in orders)
            {
                EnsureValidStatusTransition(
                    order.Status,
                    OrderStatus.Dostava_u_toku
                );

                order.CourierId = courierId;
                order.Status = OrderStatus.Dostava_u_toku;
            }

            await _unitOfWork.SaveChangesAsync(ct);

            foreach (var order in orders)
            {
                await _orderNotificationService.NotifyOrderChangedAsync(
                    order,
                    "OrderDeliveryStarted",
                    ct
                );
            }

            _logger.LogInformation(
                "Kurir {CourierId} je pokrenuo batch dostavu za porudžbine: {OrderIds}.",
                courierId,
                string.Join(", ", orderIds)
            );

            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        public async Task<OrderDashboardDto> GetDashboardAsync(
            OrderDashboardQueryDto query,
            CancellationToken ct = default)
        {
            return await _orderRepo.GetDashboardAsync(query, ct);
        }

        private static void EnsureValidStatusTransition(
            OrderStatus currentStatus,
            OrderStatus newStatus)
        {
            var isValid = currentStatus switch
            {
                OrderStatus.Na_Cekanju =>
                    newStatus is OrderStatus.Prihvacena or OrderStatus.Odbijena,

                OrderStatus.Prihvacena =>
                    newStatus is OrderStatus.Spremna_za_preuzimanje,

                OrderStatus.Spremna_za_preuzimanje =>
                    newStatus is OrderStatus.Dostava_u_toku,

                OrderStatus.Dostava_u_toku =>
                    newStatus is OrderStatus.Dostavljena,

                _ => false
            };

            if (!isValid)
            {
                throw new BadRequestException(
                    $"Status nije moguće promeniti iz {currentStatus} u {newStatus}."
                );
            }
        }

        private static string GenerateOrderNumber(int orderId, DateTime createdAt)
        {
            return $"{createdAt:yyMMdd}-{orderId:D5}";
        }
    }
}
