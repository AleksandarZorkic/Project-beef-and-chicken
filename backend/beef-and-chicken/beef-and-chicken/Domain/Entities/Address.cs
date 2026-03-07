namespace beef_and_chicken.Domain.Entities
{
    public class Address
    {
        public int Id { get; set; }

        public string Street { get; set; } = string.Empty;
        public string HouseNumber { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;

        public string? Label { get; set; }
        public string? Note { get; set; }
        public bool IsDefault { get; set; }

        public int CustomerId { get; set; } 
        public User Customer { get; set; } = null!;
    }
}
