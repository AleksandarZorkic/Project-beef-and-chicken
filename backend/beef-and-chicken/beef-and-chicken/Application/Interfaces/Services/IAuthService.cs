using beef_and_chicken.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegistrationDto data);

        Task<string> Login(LoginDto data);

        Task ForgotPasswordAsync(
            ForgotPasswordDto data,
            CancellationToken ct = default
        );

        Task ResetPasswordAsync(
            ResetPasswordDto data,
            CancellationToken ct = default
        );

        Task<UserProfileDto> GetProfileAsync(
            int userId,
            CancellationToken ct = default
        );

        Task<UserProfileDto> UpdatePhoneNumberAsync(
            int userId,
            UpdatePhoneNumberDto data,
            CancellationToken ct = default
        );

        Task<UserProfileDto> UpdateProfileAsync(
            int userId,
            UpdateUserProfileDto data,
            CancellationToken ct = default
        );

        Task<UserProfileDto> UpdateProfilePictureAsync(
            int userId,
            IFormFile image,
            CancellationToken ct = default
        );
    }
}