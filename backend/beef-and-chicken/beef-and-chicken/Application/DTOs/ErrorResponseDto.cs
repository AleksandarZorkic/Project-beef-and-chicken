namespace beef_and_chicken.Application.DTOs
{
    public class ErrorResponseDto
    {
        public string Error { get; set; } = string.Empty;
        public string TraceId { get; set; } = string.Empty;
    }
}
