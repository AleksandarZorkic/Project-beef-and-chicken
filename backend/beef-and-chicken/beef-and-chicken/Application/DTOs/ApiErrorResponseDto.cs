namespace beef_and_chicken.Application.DTOs
{
    public sealed class ApiErrorResponseDto
    {
        public string Error { get; init; } =
            string.Empty;

        public string TraceId { get; init; } =
            string.Empty;
    }
}