using Microsoft.AspNetCore.Identity;
using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class User : IdentityUser<int>
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }

        public bool IsAnonymized { get; set; }
        public DateTimeOffset? AnonymizedAt { get; set; }
        public DateTimeOffset? BlockedAt { get; set; }
        public string? BlockReason { get; set; }

        // Collections
        public ICollection<UserAllergen> UserAllergens { get; set; } = new List<UserAllergen>();
        public ICollection<EmployeeWorkTime> EmployeeWorkTimes { get; set; } = new List<EmployeeWorkTime>();
        public ICollection<Address> Addresses { get; set; } = new List<Address>();
        public ICollection<DeliveryRushRun> DeliveryRushRuns { get; set; } = new List<DeliveryRushRun>();
    }
}
