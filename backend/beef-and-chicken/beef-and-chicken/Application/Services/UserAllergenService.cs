using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class UserAllergenService : IUserAllergenService
    {
        private readonly IUserAllergenRepository _userAllergenRepository;
        private readonly IAllergenRepository _allergenRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<UserAllergenService> _logger;

        public UserAllergenService(
            IUserAllergenRepository userAllergenRepository,
            IAllergenRepository allergenRepository,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<UserAllergenService> logger)
        {
            _userAllergenRepository = userAllergenRepository;
            _allergenRepository = allergenRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<List<AllergenDto>> GetMyAllergensAsync(
            int userId,
            CancellationToken ct = default)
        {
            var userAllergens = await _userAllergenRepository.GetUserAllergensAsync(userId, ct);

            var allergens = userAllergens
                .Select(ua => ua.Allergen)
                .ToList();

            return _mapper.Map<List<AllergenDto>>(allergens);
        }

        public async Task<AllergenDto> AddAllergenToUserAsync(
            int userId,
            int allergenId,
            CancellationToken ct = default)
        {
            var allergen = await _allergenRepository.GetByIdAsync(allergenId, ct);

            if (allergen == null)
                throw new NotFoundException("Alergen nije pronađen.");

            var alreadyAdded = await _userAllergenRepository.ExistsAsync(
                userId,
                allergenId,
                ct
            );

            if (alreadyAdded)
            {
                _logger.LogWarning(
                    "User allergen add failed. UserId={UserId}, AllergenId={AllergenId}. Reason=AlreadyAdded",
                    userId,
                    allergenId
                );

                throw new BadRequestException("Ovaj alergen je već dodat na profil.");
            }

            var userAllergen = new UserAllergen
            {
                UserId = userId,
                AllergenId = allergenId
            };

            await _userAllergenRepository.AddAsync(userAllergen, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "User allergen added. UserId={UserId}, AllergenId={AllergenId}, AllergenName={AllergenName}",
                userId,
                allergenId,
                allergen.Name
            );

            return _mapper.Map<AllergenDto>(allergen);
        }

        public async Task RemoveAllergenFromUserAsync(
            int userId,
            int allergenId,
            CancellationToken ct = default)
        {
            var deleted = await _userAllergenRepository.DeleteAsync(
                userId,
                allergenId,
                ct
            );

            if (!deleted)
                throw new NotFoundException("Alergen nije pronađen na korisničkom profilu.");

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "User allergen removed. UserId={UserId}, AllergenId={AllergenId}",
                userId,
                allergenId
            );
        }
    }
}