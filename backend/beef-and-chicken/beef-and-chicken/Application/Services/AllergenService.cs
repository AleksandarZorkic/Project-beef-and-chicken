using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using AutoMapper;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class AllergenService : IAllergenService
    {
        private readonly IAllergenRepository _allergenRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<AllergenService> _logger;
        private readonly IUnitOfWork _unitOfWork;

        public AllergenService(
            IAllergenRepository allergenRepository, 
            IMapper mapper, 
            ILogger<AllergenService> logger,
            IUnitOfWork unitOfWork)
        {
            _allergenRepository = allergenRepository;
            _mapper = mapper;
            _logger = logger;
            _unitOfWork = unitOfWork;
        }

        public async Task<List<AllergenDto>> GetAllAsync(CancellationToken ct = default)
        {
            var allergens = await _allergenRepository.GetAllAsync(ct);

            return _mapper.Map<List<AllergenDto>>(allergens);
        }

        public async Task<AllergenDto?> GetByIdAsync(int allergenId, CancellationToken ct = default)
        {
            var allergen = await _allergenRepository.GetByIdAsync(allergenId, ct);
            if (allergen == null)
                throw new NotFoundException("Alergen nije pronađen.");

            return _mapper.Map<AllergenDto>(allergen);
        }

        public async Task<AllergenDto> CreateAsync(CreateAllergenDto data, CancellationToken ct = default)
        {
            var name = data.Name?.Trim() ?? string.Empty;

            ValidateName(name);

            var alreadyExists = await _allergenRepository.ExistsByNameAsync(name, ct);

            if (alreadyExists)
            {
                _logger.LogWarning("Create allergen failed. Allergen with name {Name} already exists.", name);
                throw new BadRequestException("Alergen sa ovim nazivom već postoji.");
            }

            var allergen = _mapper.Map<Allergen>(data);
            allergen.Name = name;

            var createdAllergen = await _allergenRepository.AddAsync(allergen, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Allergen created. AllergenId={AllergenId}, Name={Name}",
                createdAllergen.Id,
                createdAllergen.Name
            );

            return _mapper.Map<AllergenDto>(createdAllergen);
        }

        public async Task<AllergenDto> UpdateAsync(int allergenId, UpdateAllergenDto data, CancellationToken ct = default)
        {
            var existingAllergen = await _allergenRepository.GetByIdAsync(allergenId, ct);

            if (existingAllergen == null)
                throw new NotFoundException("Alergen nije pronađen.");

            var newName = data.Name?.Trim() ?? string.Empty;

            ValidateName(newName);

            var nameChanged = !string.Equals(
                existingAllergen.Name.Trim(),
                newName,
                StringComparison.OrdinalIgnoreCase
            );

            if (nameChanged)
            {
                var alreadyExists = await _allergenRepository.ExistsByNameAsync(newName, ct);

                if (alreadyExists)
                {
                    _logger.LogWarning(
                        "Update allergen failed. Allergen with name {Name} already exists.",
                        newName
                    );

                    throw new BadRequestException("Alergen sa ovim nazivom već postoji.");
                }
            }

            var updateData = _mapper.Map<Allergen>(data);
            updateData.Name = newName;

            var updatedAllergen = await _allergenRepository.UpdateAsync(
                allergenId,
                updateData,
                ct
            );

            if (updatedAllergen == null)
                throw new NotFoundException("Alergen nije pronađen.");

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Allergen updated. AllergenId={AllergenId}, OldName={OldName}, NewName={NewName}",
                allergenId,
                existingAllergen.Name,
                updatedAllergen.Name
            );

            return _mapper.Map<AllergenDto>(updatedAllergen);
        }

        public async Task DeleteAsync(int allergenId, CancellationToken ct = default)
        {
            var existingAllergen = await _allergenRepository.GetByIdAsync(allergenId, ct);

            if (existingAllergen == null)
                throw new NotFoundException("Alergen nije pronađen.");

            var isInUse = await _allergenRepository.IsInUseAsync(allergenId, ct);

            if (isInUse)
            {
                _logger.LogWarning(
                    "Delete allergen blocked. AllergenId={AllergenId} is in use.",
                    allergenId
                );

                throw new BadRequestException("Alergen se koristi u jelovniku i ne može biti obrisan.");
            }

            var deleted = await _allergenRepository.DeleteAsync(allergenId, ct);

            if (!deleted)
                throw new NotFoundException("Alergen nije pronađen.");

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Allergen deleted. AllergenId={AllergenId}, Name={Name}",
                allergenId,
                existingAllergen.Name
            );
        }

        private static void ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new BadRequestException("Naziv alergena je obavezan.");

            if (name.Length < 2 || name.Length > 80)
                throw new BadRequestException("Naziv alergena mora biti između 2 i 80 karaktera.");
        }
    }
}
