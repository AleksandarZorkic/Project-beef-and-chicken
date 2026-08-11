using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveDishImageAsync(
            IFormFile file,
            CancellationToken ct = default
        );

        Task<string> SaveProfilePictureAsync(
            IFormFile file,
            int userId,
            CancellationToken ct = default
        );

        Task DeleteFileAsync(
            string? relativePath,
            CancellationToken ct = default
        );
    }
}