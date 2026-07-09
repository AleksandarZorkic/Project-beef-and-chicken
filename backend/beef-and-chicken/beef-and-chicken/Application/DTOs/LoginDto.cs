using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class LoginDto
    {
        [Required(ErrorMessage = "Korisničko ime je obavezno.")]
        public string UserName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lozinka je obavezna.")]
        public string Password { get; set; } = string.Empty;
    }
}