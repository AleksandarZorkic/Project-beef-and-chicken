namespace beef_and_chicken.Application.DTOs
{
    public class UpdateUserProfileDto
    {
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
    }
}