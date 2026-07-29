using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class AnnouncementService : IAnnouncementService
    {
        private readonly IAnnouncementRepository _repository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public AnnouncementService(
            IAnnouncementRepository repository,
            IUnitOfWork unitOfWork,
            IMapper mapper)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<List<AnnouncementDto>> GetAllAsync(CancellationToken ct = default)
        {
            var announcements = await _repository.GetAllAsync(ct);

            return _mapper.Map<List<AnnouncementDto>>(announcements);
        }

        public async Task<List<AnnouncementDto>> GetActiveForHomePageAsync(
            CancellationToken ct = default)
        {
            var announcements = await _repository.GetActiveForHomePageAsync(ct);

            return _mapper.Map<List<AnnouncementDto>>(announcements);
        }

        public async Task<AnnouncementDto> GetByIdAsync(
            int id,
            CancellationToken ct = default)
        {
            var announcement = await _repository.GetByIdAsync(id, ct);

            if (announcement == null)
                throw new NotFoundException("Novost nije pronađena.");

            return _mapper.Map<AnnouncementDto>(announcement);
        }

        public async Task<AnnouncementDto> CreateAsync(
            CreateAnnouncementDto data,
            CancellationToken ct = default)
        {
            Validate(data.Title, data.Content, data.StartsAt, data.EndsAt);

            var announcement = new Announcement
            {
                Title = data.Title.Trim(),
                Content = data.Content.Trim(),
                Type = data.Type,
                IsActive = data.IsActive,
                IsPinned = data.IsPinned,
                StartsAt = data.StartsAt,
                EndsAt = data.EndsAt,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(announcement, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return _mapper.Map<AnnouncementDto>(announcement);
        }

        public async Task<AnnouncementDto> UpdateAsync(
            int id,
            UpdateAnnouncementDto data,
            CancellationToken ct = default)
        {
            Validate(data.Title, data.Content, data.StartsAt, data.EndsAt);

            var announcement = await _repository.GetByIdAsync(id, ct);

            if (announcement == null)
                throw new NotFoundException("Novost nije pronađena.");

            announcement.Title = data.Title.Trim();
            announcement.Content = data.Content.Trim();
            announcement.Type = data.Type;
            announcement.IsActive = data.IsActive;
            announcement.IsPinned = data.IsPinned;
            announcement.StartsAt = data.StartsAt;
            announcement.EndsAt = data.EndsAt;
            announcement.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);

            return _mapper.Map<AnnouncementDto>(announcement);
        }

        public async Task DeactivateAsync(int id, CancellationToken ct = default)
        {
            var announcement = await _repository.GetByIdAsync(id, ct);

            if (announcement == null)
                throw new NotFoundException("Novost nije pronađena.");

            announcement.IsActive = false;
            announcement.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);
        }

        public async Task ActivateAsync(int id, CancellationToken ct = default)
        {
            var announcement = await _repository.GetByIdAsync(id, ct);

            if (announcement == null)
                throw new NotFoundException("Novost nije pronađena.");

            announcement.IsActive = true;
            announcement.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);
        }

        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var announcement = await _repository.GetByIdAsync(id, ct);

            if (announcement == null)
                throw new NotFoundException("Novost nije pronađena.");

            announcement.IsActive = false;
            announcement.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);
        }

        private static void Validate(
            string title,
            string content,
            DateTime startsAt,
            DateTime? endsAt)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new BadRequestException("Naslov novosti je obavezan.");

            if (title.Trim().Length < 2 || title.Trim().Length > 120)
                throw new BadRequestException(
                    "Naslov novosti mora imati između 2 i 120 karaktera."
                );

            if (string.IsNullOrWhiteSpace(content))
                throw new BadRequestException("Tekst novosti je obavezan.");

            if (content.Trim().Length < 5 || content.Trim().Length > 1000)
                throw new BadRequestException(
                    "Tekst novosti mora imati između 5 i 1000 karaktera."
                );

            if (endsAt.HasValue && endsAt.Value <= startsAt)
                throw new BadRequestException(
                    "Datum završetka mora biti posle datuma početka."
                );
        }
    }
}