using AutoMapper;
using Microsoft.AspNetCore.Identity;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Domain.Entities;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace beef_and_chicken.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IMapper _mapper;
        private readonly ILogger<AuthService> _logger;
        private readonly IEmailService _emailService;  

        public AuthService(
            UserManager<User> userManager,
            IConfiguration configuration,
            IMapper mapper,
            ILogger<AuthService> logger,
            IEmailService emailService)
        {
            _userManager = userManager;
            _configuration = configuration;
            _mapper = mapper;
            _logger = logger;
            _emailService = emailService;
        }

        public async Task RegisterAsync(RegistrationDto data)
        {
            ValidateRegistration(data);

            data.FirstName = data.FirstName.Trim();
            data.LastName = data.LastName.Trim();
            data.UserName = data.UserName.Trim();
            data.Email = data.Email.Trim();
            data.PhoneNumber = NormalizePhoneNumber(data.PhoneNumber);

            var user = _mapper.Map<User>(data);
            user.PhoneNumber = data.PhoneNumber;
            user.LockoutEnabled = true;

            var result = await _userManager.CreateAsync(user, data.Password);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(error => error.Code switch
                {
                    "DuplicateUserName" => "Korisničko ime je već zauzeto.",
                    "DuplicateEmail" => "Email adresa je već zauzeta.",
                    "InvalidUserName" => "Korisničko ime nije ispravno.",
                    "InvalidEmail" => "Email adresa nije ispravna.",
                    "PasswordTooShort" => "Lozinka mora imati najmanje 8 karaktera.",
                    "PasswordRequiresNonAlphanumeric" => "Lozinka mora sadržati bar jedan specijalni karakter.",
                    "PasswordRequiresDigit" => "Lozinka mora sadržati bar jednu cifru.",
                    "PasswordRequiresLower" => "Lozinka mora sadržati bar jedno malo slovo.",
                    "PasswordRequiresUpper" => "Lozinka mora sadržati bar jedno veliko slovo.",
                    _ => "Registracija nije uspela. Proverite unete podatke."
                });

                _logger.LogWarning(
                    "User registration failed. Username={Username}, Email={Email}, ErrorCodes={ErrorCodes}",
                    data.UserName,
                    data.Email,
                    string.Join(", ", result.Errors.Select(e => e.Code))
                );

                throw new BadRequestException(string.Join(", ", errors.Distinct()));
            }

            var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.Customer);

            if (!roleResult.Succeeded)
            {
                _logger.LogError(
                    "Failed to assign role to user. UserId={UserId}, Username={Username}, ErrorCodes={ErrorCodes}",
                    user.Id,
                    user.UserName,
                    string.Join(", ", roleResult.Errors.Select(e => e.Code))
                );

                await _userManager.DeleteAsync(user);

                throw new InvalidOperationException("Korisnik je kreiran, ali rola nije dodeljena.");
            }

            _logger.LogInformation(
                "User registered. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );
        }

        public async Task<string> Login(LoginDto data)
        {
            const string invalidLoginMessage = "Korisničko ime ili lozinka nisu ispravni.";

            var username = data.UserName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(username))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Password))
                throw new BadRequestException("Lozinka je obavezna.");

            var user = await _userManager.FindByNameAsync(username);

            if (user == null)
            {
                _logger.LogWarning("Login failed. Username={Username}. Reason=UserNotFound", username);
                throw new BadRequestException(invalidLoginMessage);
            }

            var isLockedOut = await _userManager.IsLockedOutAsync(user);

            if (isLockedOut)
            {
                _logger.LogWarning(
                    "Login blocked. UserId={UserId}, Username={Username}",
                    user.Id,
                    user.UserName
                );

                throw new ForbiddenException("Nalog je blokiran. Kontaktirajte administratora.");
            }

            var passwordMatch = await _userManager.CheckPasswordAsync(user, data.Password);

            if (!passwordMatch)
            {
                _logger.LogWarning(
                    "Login failed. UserId={UserId}, Username={Username}. Reason=InvalidPassword",
                    user.Id,
                    user.UserName
                );

                throw new BadRequestException(invalidLoginMessage);
            }

            _logger.LogInformation(
                "User logged in. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );

            return await GenerateJwtAsync(user);
        }

        public async Task ForgotPasswordAsync(
            ForgotPasswordDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za reset lozinke su obavezni.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            var email = data.Email.Trim();

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                _logger.LogInformation(
                    "Password reset requested for non-existing email. Email={Email}",
                    email
                );

                return;
            }

            if (await _userManager.IsLockedOutAsync(user))
            {
                _logger.LogWarning(
                    "Password reset requested for locked user. UserId={UserId}, Email={Email}",
                    user.Id,
                    email
                );

                return;
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);

            var frontendBaseUrl = _configuration["Email:FrontendBaseUrl"]
                ?? "http://localhost:5173";

            var resetLink =
                $"{frontendBaseUrl.TrimEnd('/')}/reset-password" +
                $"?email={Uri.EscapeDataString(email)}" +
                $"&token={Uri.EscapeDataString(token)}";

            await _emailService.SendPasswordResetEmailAsync(
                email,
                resetLink,
                ct
            );

            _logger.LogInformation(
                "Password reset email requested. UserId={UserId}, Email={Email}",
                user.Id,
                email
            );
        }

        public async Task ResetPasswordAsync(
            ResetPasswordDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za promenu lozinke su obavezni.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            if (string.IsNullOrWhiteSpace(data.Token))
                throw new BadRequestException("Token je obavezan.");

            if (string.IsNullOrWhiteSpace(data.NewPassword))
                throw new BadRequestException("Nova lozinka je obavezna.");

            var email = data.Email.Trim();

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                _logger.LogWarning(
                    "Password reset failed. Reason=UserNotFound, Email={Email}",
                    email
                );

                throw new BadRequestException("Link za promenu lozinke nije ispravan ili je istekao.");
            }

            var result = await _userManager.ResetPasswordAsync(
                user,
                data.Token,
                data.NewPassword
            );

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(error => error.Code switch
                {
                    "InvalidToken" => "Link za promenu lozinke nije ispravan ili je istekao.",
                    "PasswordTooShort" => "Lozinka mora imati najmanje 8 karaktera.",
                    "PasswordRequiresNonAlphanumeric" => "Lozinka mora sadržati bar jedan specijalni karakter.",
                    "PasswordRequiresDigit" => "Lozinka mora sadržati bar jednu cifru.",
                    "PasswordRequiresLower" => "Lozinka mora sadržati bar jedno malo slovo.",
                    "PasswordRequiresUpper" => "Lozinka mora sadržati bar jedno veliko slovo.",
                    _ => "Promena lozinke nije uspela."
                });

                _logger.LogWarning(
                    "Password reset failed. UserId={UserId}, Email={Email}, ErrorCodes={ErrorCodes}",
                    user.Id,
                    email,
                    string.Join(", ", result.Errors.Select(e => e.Code))
                );

                throw new BadRequestException(string.Join(", ", errors.Distinct()));
            }

            _logger.LogInformation(
                "Password reset completed. UserId={UserId}, Email={Email}",
                user.Id,
                email
            );
        }

        public async Task<UserProfileDto> GetProfileAsync(
            int userId,
            CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            var roles = await _userManager.GetRolesAsync(user);

            return await BuildUserProfileDtoAsync(user);
        }

        public async Task<UserProfileDto> UpdatePhoneNumberAsync(
            int userId,
            UpdatePhoneNumberDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za izmenu broja telefona su obavezni.");

            ValidatePhoneNumber(data.PhoneNumber);

            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            user.PhoneNumber = NormalizePhoneNumber(data.PhoneNumber);

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(error => error.Code switch
                {
                    "InvalidPhoneNumber" => "Broj telefona nije ispravan.",
                    _ => error.Description
                });

                throw new BadRequestException(string.Join(", ", errors.Distinct()));
            }

            var roles = await _userManager.GetRolesAsync(user);

            return await BuildUserProfileDtoAsync(user);
        }

        public async Task<UserProfileDto> UpdateProfileAsync(
            int userId,
            UpdateUserProfileDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci za izmenu profila su obavezni.");

            var firstName = NormalizeProfileName(data.FirstName, "Ime");
            var lastName = NormalizeProfileName(data.LastName, "Prezime");
            var phoneNumber = NormalizeOptionalPhoneNumber(data.PhoneNumber);

            if (phoneNumber != null)
            {
                ValidatePhoneNumber(phoneNumber);
            }

            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            user.FirstName = firstName;
            user.LastName = lastName;
            user.PhoneNumber = phoneNumber;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(error => error.Code switch
                {
                    "InvalidPhoneNumber" => "Broj telefona nije ispravan.",
                    _ => error.Description
                });

                throw new BadRequestException(string.Join(", ", errors.Distinct()));
            }

            _logger.LogInformation(
                "User profile updated. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );

            return await BuildUserProfileDtoAsync(user);
        }

        private async Task<string> GenerateJwtAsync(User user)
        {
            var roles = await _userManager.GetRolesAsync(user);

            var username = user.UserName
                ?? throw new InvalidOperationException("UserName nije postavljen.");

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim("username", username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var jwtKey = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT ključ nije podešen.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(3),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static void ValidateRegistration(RegistrationDto data)
        {
            if (data == null)
                throw new BadRequestException("Podaci za registraciju su obavezni.");

            if (string.IsNullOrWhiteSpace(data.FirstName))
                throw new BadRequestException("Ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.LastName))
                throw new BadRequestException("Prezime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.UserName))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            if (string.IsNullOrWhiteSpace(data.Password))
                throw new BadRequestException("Lozinka je obavezna.");

            if (string.IsNullOrWhiteSpace(data.PhoneNumber))
                throw new BadRequestException("Broj telefona je obavezan.");

            ValidatePhoneNumber(data.PhoneNumber);
        }

        private static string NormalizePhoneNumber(string phoneNumber)
        {
            return phoneNumber.Trim();
        }

        private static void ValidatePhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                throw new BadRequestException("Broj telefona je obavezan.");

            var trimmed = phoneNumber.Trim();

            if (trimmed.Length < 6 || trimmed.Length > 20)
            {
                throw new BadRequestException(
                    "Broj telefona mora imati između 6 i 20 karaktera."
                );
            }

            var allowedCharacters = trimmed.All(c =>
                char.IsDigit(c) ||
                c == '+' ||
                c == '-' ||
                c == '/' ||
                c == ' ' ||
                c == '(' ||
                c == ')'
            );

            if (!allowedCharacters)
            {
                throw new BadRequestException(
                    "Broj telefona može sadržati samo brojeve, razmake i znakove + - / ( )."
                );
            }
        }

        private static string NormalizeProfileName(string value, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new BadRequestException($"{fieldName} je obavezno.");

            var trimmed = value.Trim();

            if (trimmed.Length < 2)
                throw new BadRequestException($"{fieldName} mora imati najmanje 2 karaktera.");

            if (trimmed.Length > 50)
                throw new BadRequestException($"{fieldName} može imati najviše 50 karaktera.");

            return trimmed;
        }

        private static string? NormalizeOptionalPhoneNumber(string? phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return null;

            return phoneNumber.Trim();
        }

        private async Task<UserProfileDto> BuildUserProfileDtoAsync(User user)
        {
            var roles = await _userManager.GetRolesAsync(user);

            return new UserProfileDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? string.Empty,
                UserName = user.UserName ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Roles = roles.ToList()
            };
        }
    }
}