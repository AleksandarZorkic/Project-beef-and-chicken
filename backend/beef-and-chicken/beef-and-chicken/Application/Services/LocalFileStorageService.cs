using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Infrastructure.Services
{
    public class LocalFileStorageService : IFileStorageService
    {
        private const long MaxDishImageSize = 5 * 1024 * 1024;
        private const long MaxProfilePictureSize = 2 * 1024 * 1024;

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
            return await SaveImageAsync(
                file,
                "dishes",
                MaxDishImageSize,
                "Slika može imati najviše 5MB.",
                ct
            );
        }

        public async Task<string> SaveProfilePictureAsync(
            IFormFile file,
            int userId,
            CancellationToken ct = default)
        {
            return await SaveImageAsync(
                file,
                "profile-pictures",
                MaxProfilePictureSize,
                "Profilna slika može imati najviše 2MB.",
                ct,
                $"user-{userId}-"
            );
        }

        public Task DeleteFileAsync(
            string? relativePath,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
                return Task.CompletedTask;

            var normalizedPath = relativePath.Replace("\\", "/");

            if (!normalizedPath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                return Task.CompletedTask;

            var webRootPath = GetWebRootPath();

            var filePath = Path.Combine(
                webRootPath,
                normalizedPath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
            );

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            return Task.CompletedTask;
        }

        private async Task<string> SaveImageAsync(
            IFormFile file,
            string folderName,
            long maxFileSize,
            string maxFileSizeErrorMessage,
            CancellationToken ct,
            string fileNamePrefix = "")
        {
            if (file == null || file.Length == 0)
                throw new BadRequestException("Slika je obavezna.");

            if (file.Length > maxFileSize)
                throw new BadRequestException(maxFileSizeErrorMessage);

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
            {
                throw new BadRequestException(
                    "Dozvoljeni formati slike su jpg, jpeg, png i webp."
                );
            }

            var webRootPath = GetWebRootPath();

            var uploadFolder = Path.Combine(
                webRootPath,
                "uploads",
                folderName
            );

            Directory.CreateDirectory(uploadFolder);

            var fileName = $"{fileNamePrefix}{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadFolder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);

            await file.CopyToAsync(stream, ct);

            return $"/uploads/{folderName}/{fileName}";
        }

        private string GetWebRootPath()
        {
            var webRootPath = _environment.WebRootPath;

            if (!string.IsNullOrWhiteSpace(webRootPath))
                return webRootPath;

            return Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );
        }
    }
}