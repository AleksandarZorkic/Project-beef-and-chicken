using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class GoogleLoginDto
    {
        [Required(ErrorMessage = "Google token je obavezan.")]
        public string IdToken { get; set; } = string.Empty;

        public bool CreateAccountIfMissing { get; set; } = false;
    }
}