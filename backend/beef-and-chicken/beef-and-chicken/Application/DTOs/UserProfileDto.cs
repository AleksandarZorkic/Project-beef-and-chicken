namespace beef_and_chicken.Application.DTOs
{
    public class UserProfileDto
    {
        public int Id { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string UserName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public List<string> Roles { get; set; } = new();
    }
}