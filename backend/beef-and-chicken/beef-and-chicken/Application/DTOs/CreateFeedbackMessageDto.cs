using System.ComponentModel.DataAnnotations;
using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class CreateFeedbackMessageDto
    {
        public FeedbackMessageType Type { get; set; } =
            FeedbackMessageType.Suggestion;

        [Required(ErrorMessage = "Poruka je obavezna.")]
        [MinLength(10, ErrorMessage = "Poruka mora imati najmanje 10 karaktera.")]
        [MaxLength(1000, ErrorMessage = "Poruka može imati najviše 1000 karaktera.")]
        public string Message { get; set; } = string.Empty;

        [MaxLength(2048, ErrorMessage = "URL stranice je predugačak.")]
        public string? PageUrl { get; set; }

        [MaxLength(100, ErrorMessage = "Visitor ID je predugačak.")]
        public string? VisitorId { get; set; }

        [EmailAddress(ErrorMessage = "Kontakt email nije ispravan.")]
        [MaxLength(256, ErrorMessage = "Kontakt email je predugačak.")]
        public string? ContactEmail { get; set; }
    }
}