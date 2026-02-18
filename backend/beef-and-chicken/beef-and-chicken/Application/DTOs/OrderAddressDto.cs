using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderAddressDto
    {
        [Required]
        public string Street { get; set; } = string.Empty;
        [Required]
        public string HouseNumber { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        [Required]
        public string City { get; set; } = string.Empty;
    }
}
