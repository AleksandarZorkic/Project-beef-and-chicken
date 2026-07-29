using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.Services
{
    public class DishOptionService : IDishOptionService
    {
        private readonly IDishOptionRepository _repository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<DishOptionService> _logger;

        public DishOptionService(
            IDishOptionRepository repository,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<DishOptionService> logger)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<List<DishOptionDto>> GetAllAsync(
            bool includeInactive = false,
            DishOptionType? type = null,
            CancellationToken ct = default)
        {
            var options = await _repository.GetAllAsync(includeInactive, type, ct);
            return _mapper.Map<List<DishOptionDto>>(options);
        }

        public async Task<List<DishOptionDto>> GetActiveAsync(CancellationToken ct = default)
        {
            var options = await _repository.GetActiveAsync(ct);
            return _mapper.Map<List<DishOptionDto>>(options);
        }

        public async Task<DishOptionDto> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var option = await _repository.GetByIdAsync(id, ct);

            if (option == null)
                throw new NotFoundException($"Opcija sa ID-jem {id} nije pronađena.");

            return _mapper.Map<DishOptionDto>(option);
        }

        public async Task<DishOptionDto> CreateAsync(
            CreateDishOptionDto data,
            CancellationToken ct = default)
        {
            Validate(data.Name, data.Type, data.Price, data.IsAlwaysPaid);

            var name = data.Name.Trim();

            var exists = await _repository.ExistsByNameAndTypeAsync(
                name,
                data.Type,
                null,
                ct
            );

            if (exists)
                throw new ConflictException("Opcija sa istim nazivom i tipom već postoji.");

            ValidateSweetAdditionRules(data.Type, data.Price);

            var isAlwaysPaid = ResolveIsAlwaysPaid(data.Type, data.IsAlwaysPaid);

            var option = new DishOption
            {
                Name = name,
                Type = data.Type,
                Price = NormalizePrice(data.Type, data.Price, data.IsAlwaysPaid),
                IsAlwaysPaid = NormalizeIsAlwaysPaid(data.Type, data.IsAlwaysPaid),
                IsActive = true,
                SortOrder = data.SortOrder
            };

            await _repository.AddAsync(option, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish option created. OptionId={OptionId}, Name={Name}, Type={Type}",
                option.Id,
                option.Name,
                option.Type
            );

            return _mapper.Map<DishOptionDto>(option);
        }

        public async Task<DishOptionDto> UpdateAsync(
            int id,
            UpdateDishOptionDto data,
            CancellationToken ct = default)
        {
            Validate(data.Name, data.Type, data.Price, data.IsAlwaysPaid);

            var option = await _repository.GetByIdAsync(id, ct);

            if (option == null)
                throw new NotFoundException($"Opcija sa ID-jem {id} nije pronađena.");

            var name = data.Name.Trim();

            var exists = await _repository.ExistsByNameAndTypeAsync(
                name,
                data.Type,
                id,
                ct
            );

            if (exists)
                throw new ConflictException("Opcija sa istim nazivom i tipom već postoji.");

            ValidateSweetAdditionRules(data.Type, data.Price);

            var isAlwaysPaid = ResolveIsAlwaysPaid(data.Type, data.IsAlwaysPaid);

            option.Name = name;
            option.Type = data.Type;
            option.Price = NormalizePrice(data.Type, data.Price, data.IsAlwaysPaid);
            option.IsAlwaysPaid = NormalizeIsAlwaysPaid(data.Type, data.IsAlwaysPaid);
            option.SortOrder = data.SortOrder;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish option updated. OptionId={OptionId}, Name={Name}, Type={Type}",
                option.Id,
                option.Name,
                option.Type
            );

            return _mapper.Map<DishOptionDto>(option);
        }

        public async Task<DishOptionDto> ActivateAsync(int id, CancellationToken ct = default)
        {
            var option = await _repository.GetByIdAsync(id, ct);

            if (option == null)
                throw new NotFoundException($"Opcija sa ID-jem {id} nije pronađena.");

            if (option.IsActive)
                return _mapper.Map<DishOptionDto>(option);

            option.IsActive = true;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish option activated. OptionId={OptionId}",
                option.Id
            );

            return _mapper.Map<DishOptionDto>(option);
        }

        public async Task<DishOptionDto> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var option = await _repository.GetByIdAsync(id, ct);

            if (option == null)
                throw new NotFoundException($"Opcija sa ID-jem {id} nije pronađena.");

            if (!option.IsActive)
                return _mapper.Map<DishOptionDto>(option);

            option.IsActive = false;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish option deactivated. OptionId={OptionId}",
                option.Id
            );

            return _mapper.Map<DishOptionDto>(option);
        }

        private static void Validate(
            string name,
            DishOptionType type,
            decimal price,
            bool isAlwaysPaid)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new BadRequestException("Naziv opcije je obavezan.");

            if (name.Trim().Length > 100)
                throw new BadRequestException("Naziv opcije može imati najviše 100 karaktera.");

            if (price < 0)
                throw new BadRequestException("Cena ne može biti negativna.");

            if (type == DishOptionType.Spice)
            {
                if (price != 0)
                    throw new BadRequestException("Začin ne može imati cenu.");

                if (isAlwaysPaid)
                    throw new BadRequestException("Začin ne može biti opcija koja se odmah naplaćuje.");
            }

            if (type == DishOptionType.SideDish && isAlwaysPaid && price <= 0)
            {
                throw new BadRequestException(
                    "Prilog koji se odmah naplaćuje mora imati cenu veću od 0."
                );
            }
        }

        private static decimal NormalizePrice(
            DishOptionType type,
            decimal price,
            bool isAlwaysPaid)
        {
            if (type == DishOptionType.Spice)
                return 0;

            if (type == DishOptionType.SweetAddition)
                return price;

            if (!isAlwaysPaid)
                return 0;

            return price;
        }

        private static bool NormalizeIsAlwaysPaid(
            DishOptionType type,
            bool isAlwaysPaid)
        {
            if (type == DishOptionType.Spice)
                return false;

            return isAlwaysPaid;
        }

        private static void ValidateSweetAdditionRules(
            DishOptionType type,
            decimal price)
        {
            if (type == DishOptionType.SweetAddition && price <= 0)
            {
                throw new BadRequestException(
                    "Slatki dodatak mora imati cenu veću od 0."
                );
            }
        }

        private static bool ResolveIsAlwaysPaid(
            DishOptionType type,
            bool isAlwaysPaid)
        {
            if (type == DishOptionType.SweetAddition)
            {
                return true;
            }

            return isAlwaysPaid;
        }
    }
}