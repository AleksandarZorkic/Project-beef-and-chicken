using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email je obavezan.")]
        [EmailAddress(ErrorMessage = "Email nije ispravan.")]
        public string Email { get; set; } = string.Empty;
    }
}