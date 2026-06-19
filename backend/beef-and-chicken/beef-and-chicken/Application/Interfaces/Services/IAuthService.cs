using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegistrationDto data);
        Task<string> Login(LoginDto data);
    }
}
