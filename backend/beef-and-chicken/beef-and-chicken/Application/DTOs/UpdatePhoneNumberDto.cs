using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class UpdatePhoneNumberDto
    {
        [Required(ErrorMessage = "Broj telefona je obavezan.")]
        [MaxLength(20, ErrorMessage = "Broj telefona može imati najviše 20 karaktera.")]
        public string PhoneNumber { get; set; } = string.Empty;
    }
}