using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using Microsoft.AspNetCore.Identity;

namespace beef_and_chicken.Application.Services
{
    public class FeedbackMessageService : IFeedbackMessageService
    {
        private readonly IFeedbackMessageRepository _repository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<FeedbackMessageService> _logger;

        public FeedbackMessageService(
            IFeedbackMessageRepository repository,
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUserService,
            UserManager<User> userManager,
            ILogger<FeedbackMessageService> logger)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<FeedbackMessageDto> CreateAsync(
            CreateFeedbackMessageDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za sugestiju su obavezni.");

            if (!Enum.IsDefined(typeof(FeedbackMessageType), data.Type))
                throw new BadRequestException("Tip poruke nije ispravan.");

            var messageText = data.Message?.Trim() ?? string.Empty;

            if (messageText.Length < 10)
                throw new BadRequestException("Poruka mora imati najmanje 10 karaktera.");

            if (messageText.Length > 1000)
                throw new BadRequestException("Poruka može imati najviše 1000 karaktera.");

            var pageUrl = NormalizeOptional(data.PageUrl, 2048, "URL stranice je predugačak.");
            var visitorId = NormalizeOptional(data.VisitorId, 100, "Visitor ID je predugačak.");
            var contactEmail = NormalizeOptional(data.ContactEmail, 256, "Kontakt email je predugačak.");

            var user = await GetCurrentUserAsync();

            var feedback = new FeedbackMessage
            {
                UserId = user?.Id,
                UserEmail = user?.Email,
                UserName = user?.UserName,
                VisitorId = visitorId,
                ContactEmail = contactEmail,
                Type = data.Type,
                Message = messageText,
                PageUrl = pageUrl,
                Status = FeedbackMessageStatus.New,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            await _repository.AddAsync(feedback, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Feedback message created. FeedbackId={FeedbackId}, UserId={UserId}, Type={Type}",
                feedback.Id,
                feedback.UserId,
                feedback.Type
            );

            return MapToDto(feedback);
        }

        public async Task<IReadOnlyList<FeedbackMessageDto>> GetForAdminAsync(
            FeedbackMessageQueryDto query,
            CancellationToken ct = default)
        {
            query ??= new FeedbackMessageQueryDto();

            var messages = await _repository.GetForAdminAsync(query, ct);

            return messages
                .Select(MapToDto)
                .ToList();
        }

        public async Task<FeedbackMessageDto> MarkAsReadAsync(
            int id,
            CancellationToken ct = default)
        {
            var feedback = await _repository.GetByIdAsync(id, ct);

            if (feedback == null)
                throw new NotFoundException("Sugestija nije pronađena.");

            if (feedback.Status == FeedbackMessageStatus.New)
            {
                feedback.Status = FeedbackMessageStatus.Read;
                feedback.ReadAtUtc = DateTimeOffset.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Feedback message marked as read. FeedbackId={FeedbackId}",
                feedback.Id
            );

            return MapToDto(feedback);
        }

        public async Task<FeedbackMessageDto> ArchiveAsync(
            int id,
            CancellationToken ct = default)
        {
            var feedback = await _repository.GetByIdAsync(id, ct);

            if (feedback == null)
                throw new NotFoundException("Sugestija nije pronađena.");

            feedback.Status = FeedbackMessageStatus.Archived;
            feedback.ArchivedAtUtc = DateTimeOffset.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Feedback message archived. FeedbackId={FeedbackId}",
                feedback.Id
            );

            return MapToDto(feedback);
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var userId = _currentUserService.UserId;

            if (!userId.HasValue)
            {
                return null;
            }

            return await _userManager.FindByIdAsync(userId.Value.ToString());
        }

        private static string? NormalizeOptional(
            string? value,
            int maxLength,
            string errorMessage)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();

            if (trimmed.Length > maxLength)
                throw new BadRequestException(errorMessage);

            return trimmed;
        }

        private static FeedbackMessageDto MapToDto(FeedbackMessage feedback)
        {
            return new FeedbackMessageDto
            {
                Id = feedback.Id,
                UserId = feedback.UserId,
                VisitorId = feedback.VisitorId,
                UserEmail = feedback.UserEmail,
                UserName = feedback.UserName,
                ContactEmail = feedback.ContactEmail,
                Type = feedback.Type,
                Message = feedback.Message,
                PageUrl = feedback.PageUrl,
                Status = feedback.Status,
                CreatedAtUtc = feedback.CreatedAtUtc,
                ReadAtUtc = feedback.ReadAtUtc,
                ArchivedAtUtc = feedback.ArchivedAtUtc
            };
        }
    }
}