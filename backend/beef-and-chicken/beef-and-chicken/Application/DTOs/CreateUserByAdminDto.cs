namespace beef_and_chicken.Application.DTOs
{
    public class CreateUserByAdminDto
    {
        public string Email { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        public List<string> Roles { get; set; } = new();
    }
}
