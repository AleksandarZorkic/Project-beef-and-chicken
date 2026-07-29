using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Infrastructure.Services
{
    public class LocalFileStorageService : IFileStorageService
    {
        private const long MaxFileSize = 5 * 1024 * 1024;

        private static readonly string[] AllowedExtensions =
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        private readonly IWebHostEnvironment _environment;

        public LocalFileStorageService(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<string> SaveDishImageAsync(
            IFormFile file,
            CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                throw new BadRequestException("Slika je obavezna.");

            if (file.Length > MaxFileSize)
                throw new BadRequestException("Slika može imati najviše 5MB.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
            {
                throw new BadRequestException(
                    "Dozvoljeni formati slike su jpg, jpeg, png i webp."
                );
            }

            var webRootPath = _environment.WebRootPath;

            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot"
                );
            }

            var uploadFolder = Path.Combine(
                webRootPath,
                "uploads",
                "dishes"
            );

            Directory.CreateDirectory(uploadFolder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadFolder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);

            await file.CopyToAsync(stream, ct);

            return $"/uploads/dishes/{fileName}";
        }
    }
}