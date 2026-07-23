using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace beef_and_chicken.Application.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepository _categoryRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<CategoryService> _logger;

        public CategoryService(
            ICategoryRepository categoryRepo,
            IUnitOfWork unitOfWork,
            ILogger<CategoryService> logger)
        {
            _categoryRepo = categoryRepo;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<IEnumerable<CategoryDto>> GetAllAsync(
            CancellationToken ct = default)
        {
            var categories = await _categoryRepo.GetAllAsync(ct);

            return categories.Select(ToDto);
        }

        public async Task<IEnumerable<CategoryDto>> GetActiveAsync(
            CancellationToken ct = default)
        {
            var categories = await _categoryRepo.GetActiveAsync(ct);

            return categories.Select(ToDto);
        }

        public async Task<CategoryDto> GetByIdAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            var category = await _categoryRepo.GetByIdAsync(categoryId, ct);

            if (category == null)
                throw new NotFoundException("Kategorija nije pronađena.");

            return ToDto(category);
        }

        public async Task<CategoryDto> CreateAsync(
            CreateCategoryDto dto,
            CancellationToken ct = default)
        {
            if (dto == null)
                throw new BadRequestException("Podaci za kategoriju su obavezni.");

            ValidateCategory(dto.Name, dto.Description, dto.SortOrder);

            var name = dto.Name.Trim();

            var nameExists = await _categoryRepo.ExistsByNameAsync(name, null, ct);

            if (nameExists)
                throw new BadRequestException("Kategorija sa ovim nazivom već postoji.");

            var category = new Category
            {
                Name = name,
                Description = NormalizeOptionalText(dto.Description),
                SortOrder = dto.SortOrder,
                IsActive = true
            };

            await _categoryRepo.AddAsync(category, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Category created. CategoryId={CategoryId}, Name={Name}",
                category.Id,
                category.Name
            );

            var createdCategory = await _categoryRepo.GetByIdAsync(category.Id, ct);

            if (createdCategory == null)
                throw new NotFoundException("Kategorija nije pronađena nakon kreiranja.");

            return ToDto(createdCategory);
        }

        public async Task<CategoryDto> UpdateAsync(
            int categoryId,
            UpdateCategoryDto dto,
            CancellationToken ct = default)
        {
            if (dto == null)
                throw new BadRequestException("Podaci za kategoriju su obavezni.");

            ValidateCategory(dto.Name, dto.Description, dto.SortOrder);

            var category = await _categoryRepo.GetByIdForUpdateAsync(categoryId, ct);

            if (category == null)
                throw new NotFoundException("Kategorija nije pronađena.");

            var name = dto.Name.Trim();

            var nameExists = await _categoryRepo.ExistsByNameAsync(
                name,
                categoryId,
                ct
            );

            if (nameExists)
                throw new BadRequestException("Kategorija sa ovim nazivom već postoji.");

            category.Name = name;
            category.Description = NormalizeOptionalText(dto.Description);
            category.SortOrder = dto.SortOrder;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Category updated. CategoryId={CategoryId}, Name={Name}",
                category.Id,
                category.Name
            );

            return ToDto(category);
        }

        public async Task DeactivateAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            var category = await _categoryRepo.GetByIdForUpdateAsync(categoryId, ct);

            if (category == null)
                throw new NotFoundException("Kategorija nije pronađena.");

            if (!category.IsActive)
                throw new BadRequestException("Kategorija je već deaktivirana.");

            category.IsActive = false;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Category deactivated. CategoryId={CategoryId}, Name={Name}",
                category.Id,
                category.Name
            );
        }

        public async Task<CategoryDto> ActivateAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            var category = await _categoryRepo.GetByIdForUpdateAsync(categoryId, ct);

            if (category == null)
                throw new NotFoundException("Kategorija nije pronađena.");

            if (category.IsActive)
                throw new BadRequestException("Kategorija je već aktivna.");

            category.IsActive = true;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Category activated. CategoryId={CategoryId}, Name={Name}",
                category.Id,
                category.Name
            );

            return ToDto(category);
        }

        public async Task DeleteAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            var category = await _categoryRepo.GetByIdForUpdateAsync(categoryId, ct);

            if (category == null)
                throw new NotFoundException("Kategorija nije pronađena.");

            if (category.Dishes.Any())
            {
                throw new BadRequestException(
                    "Kategorija ima povezana jela i ne može biti obrisana. Umesto toga je deaktiviraj."
                );
            }

            _categoryRepo.Remove(category);

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Category deleted. CategoryId={CategoryId}, Name={Name}",
                category.Id,
                category.Name
            );
        }

        private static void ValidateCategory(
            string name,
            string? description,
            int sortOrder)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new BadRequestException("Naziv kategorije je obavezan.");

            var trimmedName = name.Trim();

            if (trimmedName.Length < 2 || trimmedName.Length > 100)
            {
                throw new BadRequestException(
                    "Naziv kategorije mora biti između 2 i 100 karaktera."
                );
            }

            if (!string.IsNullOrWhiteSpace(description) &&
                description.Trim().Length > 500)
            {
                throw new BadRequestException(
                    "Opis kategorije ne sme biti duži od 500 karaktera."
                );
            }

            if (sortOrder < 0)
                throw new BadRequestException("Redosled kategorije ne može biti negativan.");
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static CategoryDto ToDto(Category category)
        {
            return new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive,
                SortOrder = category.SortOrder,
                DishCount = category.Dishes.Count,
                ActiveDishCount = category.Dishes.Count(d => d.IsActive)
            };
        }
    }
}