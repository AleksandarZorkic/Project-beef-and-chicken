using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class RegistrationDto
    {
        [Required(ErrorMessage = "Email je obavezan.")]
        [EmailAddress(ErrorMessage = "Email nije ispravan.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lozinka je obavezna.")]
        [MinLength(8, ErrorMessage = "Lozinka mora imati najmanje 8 karaktera.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ime je obavezno.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Prezime je obavezno.")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Korisničko ime je obavezno.")]
        public string UserName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Broj telefona je obavezan.")]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? ProfilePicture { get; set; }
    }
}