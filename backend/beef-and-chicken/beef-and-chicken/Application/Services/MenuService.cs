using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Mapping;
using beef_and_chicken.Application.Exceptions;
using System.Runtime.CompilerServices;
using AutoMapper;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepo;
        private readonly ILogger<MenuService> _logger;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IFileStorageService _fileStorageService;

        public MenuService(IMenuRepository menuRepo, ILogger<MenuService> logger, IMapper mapper, IUnitOfWork unitOfWork, IFileStorageService fileStorageService)
        {
            _menuRepo = menuRepo;
            _logger = logger;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
            _fileStorageService = fileStorageService;
        }

        public async Task<IEnumerable<DishMenuDto>> GetAllAsync(CancellationToken ct = default)
        {
            var menu = await _menuRepo.GetAllAsync(ct);
            return _mapper.Map<IEnumerable<DishMenuDto>>(menu);
        }

        public async Task<DishMenuDto> GetByIdAsync(int dishId, CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdAsync(dishId, ct);

            if (dish == null)
            {
                _logger.LogInformation("Dish not found. Id={DishId}", dishId);
                throw new NotFoundException($"Jelo sa ID-{dishId} nije pronađeno.");
            }

            return _mapper.Map<DishMenuDto>(dish);
        }

        public async Task<DishMenuDto> CreateAsync(CreateDishDto data, CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za jelo su obavezni.");

            ValidateDish(
                data.Name,
                data.Price,
                data.IsOnSale,
                data.SalePrice,
                data.CategoryId,
                data.RecommendedSortOrder
            );

            var categoryExists = await _menuRepo.CategoryExistsAsync(data.CategoryId, ct);

            if (!categoryExists)
                throw new NotFoundException("Kategorija nije pronađena.");

            var requestedAllergens = data.Allergens ?? new List<DishAllergenInputDto>();

            ValidateDishAllergens(requestedAllergens);

            var allergenIds = requestedAllergens
                .Select(a => a.AllergenId)
                .Distinct()
                .ToList();

            if (allergenIds.Any())
            {
                var existingAllergenIds = await _menuRepo.GetExistingAllergenIdsAsync(allergenIds, ct);

                var missingIds = allergenIds
                    .Where(id => !existingAllergenIds.Contains(id))
                    .ToList();

                if (missingIds.Any())
                    throw new NotFoundException($"Neki alergeni nisu pronađeni. AllergenIds: {string.Join(", ", missingIds)}");
            }

            var dish = new Dish
            {
                Name = data.Name.Trim(),
                Description = data.Description?.Trim(),
                Price = data.Price,
                IsOnSale = data.IsOnSale,
                SalePrice = data.IsOnSale ? data.SalePrice : null,
                ImageUrl = data.ImageUrl?.Trim(),
                CategoryId = data.CategoryId,
                IsRecommended = data.IsRecommended,
                RecommendedSortOrder = data.RecommendedSortOrder,
                IsActive = true,
                DishAllergens = requestedAllergens
                    .Select(a => new DishAllergen
                    {
                        AllergenId = a.AllergenId,
                        IsTrace = a.IsTrace
                    })
                    .ToList()
            };

            await _menuRepo.AddAsync(dish, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish created. DishId={DishId}, Name={Name}, CategoryId={CategoryId}",
                dish.Id,
                dish.Name,
                dish.CategoryId
            );

            var createdDish = await _menuRepo.GetByIdAsync(dish.Id, ct);

            if (createdDish == null)
                throw new NotFoundException("Jelo nije pronađeno nakon kreiranja.");

            return _mapper.Map<DishMenuDto>(createdDish);
        }

        public async Task<DishMenuDto> UpdateAsync(int dishId, UpdateDishDto data, CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za jelo su obavezni.");

            ValidateDish(
                data.Name,
                data.Price,
                data.IsOnSale,
                data.SalePrice,
                data.CategoryId,
                data.RecommendedSortOrder
            );

            var dish = await _menuRepo.GetByIdForUpdateAsync(dishId, ct);

            if (dish == null)
                throw new NotFoundException("Jelo nije pronađeno.");

            var categoryExists = await _menuRepo.CategoryExistsAsync(data.CategoryId, ct);

            if (!categoryExists)
                throw new NotFoundException("Kategorija nije pronađena.");

            var requestedAllergens = data.Allergens ?? new List<DishAllergenInputDto>();

            ValidateDishAllergens(requestedAllergens);

            var allergenIds = requestedAllergens
                .Select(a => a.AllergenId)
                .Distinct()
                .ToList();

            if (allergenIds.Any())
            {
                var existingAllergenIds = await _menuRepo.GetExistingAllergenIdsAsync(allergenIds, ct);

                var missingIds = allergenIds
                    .Where(id => !existingAllergenIds.Contains(id))
                    .ToList();

                if (missingIds.Any())
                    throw new NotFoundException($"Neki alergeni nisu pronađeni. AllergenIds: {string.Join(", ", missingIds)}");
            }

            dish.Name = data.Name.Trim();
            dish.Description = data.Description?.Trim();
            dish.Price = data.Price;
            dish.IsOnSale = data.IsOnSale;
            dish.SalePrice = data.IsOnSale ? data.SalePrice : null;
            dish.ImageUrl = data.ImageUrl?.Trim();
            dish.CategoryId = data.CategoryId;
            dish.IsRecommended = data.IsRecommended;
            dish.RecommendedSortOrder = data.RecommendedSortOrder;

            SyncDishAllergens(dish, requestedAllergens);

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish updated. DishId={DishId}, Name={Name}",
                dish.Id,
                dish.Name
            );

            var updatedDish = await _menuRepo.GetByIdAsync(dish.Id, ct);

            if (updatedDish == null)
                throw new NotFoundException("Jelo nije pronađeno nakon izmene.");

            return _mapper.Map<DishMenuDto>(updatedDish);
        }

        public async Task DeleteAsync(int dishId, CancellationToken ct = default)
        {
            await DeactivateAsync(dishId, ct);
        }

        public async Task<UploadDishImageResponseDto> UploadDishImageAsync(
            int dishId,
            IFormFile image,
            CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdForUpdateAsync(dishId, ct);

            if (dish == null)
                throw new NotFoundException($"Jelo sa ID-jem {dishId} nije pronađeno.");

            var imageUrl = await _fileStorageService.SaveDishImageAsync(image, ct);

            dish.ImageUrl = imageUrl;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish image uploaded. DishId={DishId}, ImageUrl={ImageUrl}",
                dishId,
                imageUrl
            );

            return new UploadDishImageResponseDto
            {
                ImageUrl = imageUrl
            };
        }

        public async Task<List<HomepageDishDto>> GetBestSellersAsync(
            int limit = 6,
            int days = 30,
            CancellationToken ct = default)
        {
            return await _menuRepo.GetBestSellersAsync(limit, days, ct);
        }

        public async Task<List<HomepageDishDto>> GetRecommendedDishesAsync(
            int limit = 6,
            CancellationToken ct = default)
        {
            return await _menuRepo.GetRecommendedDishesAsync(limit, ct);
        }

        private static void ValidateDish(
            string name,
            decimal price,
            bool isOnSale,
            decimal? salePrice,
            int categoryId,
            int recommendedSortOrder)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new BadRequestException("Naziv jela je obavezan.");

            if (name.Trim().Length < 2 || name.Trim().Length > 120)
                throw new BadRequestException("Naziv jela mora biti između 2 i 120 karaktera.");

            if (price <= 0)
                throw new BadRequestException("Cena jela mora biti veća od 0.");

            if (isOnSale)
            {
                if (!salePrice.HasValue)
                    throw new BadRequestException("Akcijska cena je obavezna kada je jelo na akciji.");

                if (salePrice.Value <= 0)
                    throw new BadRequestException("Akcijska cena mora biti veća od 0.");

                if (salePrice.Value >= price)
                    throw new BadRequestException("Akcijska cena mora biti manja od regularne cene.");
            }

            if (categoryId <= 0)
                throw new BadRequestException("Kategorija je obavezna.");

            if (recommendedSortOrder < 0)
                throw new BadRequestException("Redosled preporuke ne može biti negativan.");
        }

        private static void ValidateDishAllergens(List<DishAllergenInputDto> allergens)
        {
            if (allergens.Any(a => a.AllergenId <= 0))
                throw new BadRequestException("Svi alergeni moraju imati validan ID.");

            var allergenIds = allergens.Select(a => a.AllergenId).ToList();

            if (allergenIds.Count != allergenIds.Distinct().Count())
                throw new BadRequestException("Isti alergen ne može biti dodat više puta na jedno jelo.");
        }

        private static void SyncDishAllergens(Dish dish, List<DishAllergenInputDto> requestedAllergens)
        {
            var requestedById = requestedAllergens.ToDictionary(a => a.AllergenId);

            var allergensToRemove = dish.DishAllergens
                .Where(existing => !requestedById.ContainsKey(existing.AllergenId))
                .ToList();

            foreach (var allergenToRemove in allergensToRemove)
            {
                dish.DishAllergens.Remove(allergenToRemove);
            }

            foreach (var requestedAllergen in requestedAllergens)
            {
                var existingAllergen = dish.DishAllergens
                    .FirstOrDefault(existing => existing.AllergenId == requestedAllergen.AllergenId);

                if (existingAllergen != null)
                {
                    existingAllergen.IsTrace = requestedAllergen.IsTrace;
                }
                else
                {
                    dish.DishAllergens.Add(new DishAllergen
                    {
                        DishId = dish.Id,
                        AllergenId = requestedAllergen.AllergenId,
                        IsTrace = requestedAllergen.IsTrace
                    });
                }
            }
        }
        public async Task<IEnumerable<DishMenuDto>> GetInactiveAsync(CancellationToken ct = default)
        {
            var inactiveDishes = await _menuRepo.GetInactiveAsync(ct);

            return _mapper.Map<IEnumerable<DishMenuDto>>(inactiveDishes);
        }

        public async Task DeactivateAsync(int dishId, CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdForUpdateAsync(dishId, ct);

            if (dish == null)
                throw new NotFoundException("Jelo nije pronađeno.");

            if (!dish.IsActive)
                throw new BadRequestException("Jelo je već deaktivirano.");

            dish.IsActive = false;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish deactivated. DishId={DishId}, Name={Name}",
                dish.Id,
                dish.Name
            );
        }

        public async Task<DishMenuDto> ActivateAsync(int dishId, CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdForUpdateAsync(dishId, ct);

            if (dish == null)
                throw new NotFoundException("Jelo nije pronađeno.");

            if (dish.IsActive)
                throw new BadRequestException("Jelo je već aktivno.");

           var categoryExist = await _menuRepo.CategoryExistsAsync(dish.CategoryId, ct);

            if (!categoryExist)
                throw new NotFoundException("Jelo ne može biti aktivirano jer kategorija nije aktivna ili ne postoji.");

            dish.IsActive = true;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Dish activated. DishId={DishId}, Name={Name}",
                dish.Id,
                dish.Name
            );

            var activatedDish = await _menuRepo.GetByIdAsync(dish.Id, ct);

            if (activatedDish == null)
                throw new NotFoundException("Jelo nije pronađeno nakon aktivacije.");

            return _mapper.Map<DishMenuDto>(activatedDish);
        }
    }
}
