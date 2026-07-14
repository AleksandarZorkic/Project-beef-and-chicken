namespace beef_and_chicken.Application.DTOs
{
    public class OrderAddressSnapshotDto
    {
        public string Street { get; set; } = string.Empty;
        public string HouseNumber { get; set; } = string.Empty;
        public string? PostalCode { get; set; }
        public string City { get; set; } = string.Empty;
        public string? Label { get; set; }
        public string? Note { get; set; }
    }
}