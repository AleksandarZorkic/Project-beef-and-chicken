using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveDishImageAsync(
            IFormFile file,
            CancellationToken ct = default
        );
    }
}