using Microsoft.AspNetCore.Identity;
using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class User : IdentityUser<int>
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
        public Role Role { get; set; } = Role.Guest;

        // Collections
        public ICollection<UserAllergen> UserAllergens { get; set; } = new List<UserAllergen>();
        public ICollection<EmployeeWorkTime> EmployeeWorkTimes { get; set; } = new List<EmployeeWorkTime>();
        public ICollection<Address> Addresses { get; set; } = new List<Address>();

    }
}
