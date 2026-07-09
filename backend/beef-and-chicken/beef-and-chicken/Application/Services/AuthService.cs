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

        public AuthService(
            UserManager<User> userManager,
            IConfiguration configuration,
            IMapper mapper,
            ILogger<AuthService> logger)
        {
            _userManager = userManager;
            _configuration = configuration;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task RegisterAsync(RegistrationDto data)
        {
            ValidateRegistration(data);

            data.FirstName = data.FirstName.Trim();
            data.LastName = data.LastName.Trim();
            data.UserName = data.UserName.Trim();
            data.Email = data.Email.Trim();

            var user = _mapper.Map<User>(data);
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
        }
    }
}