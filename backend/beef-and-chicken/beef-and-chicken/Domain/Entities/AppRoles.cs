namespace beef_and_chicken.Domain.Entities
{
    public static class AppRoles
    {
        public const string Admin = "Admin";
        public const string Customer = "Customer";
        public const string Employee = "Employee";
        public const string Courier = "Courier";

        public static readonly string[] All = {
            Admin,
            Customer,
            Employee,
            Courier,
        };
    }
}
