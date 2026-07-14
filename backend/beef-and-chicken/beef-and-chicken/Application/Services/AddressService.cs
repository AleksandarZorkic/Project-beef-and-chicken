using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class AddressService : IAddressService
    {
        private readonly IAddressRepository _addressRepo;
        private readonly ILogger<AddressService> _logger;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public AddressService(IAddressRepository addressRepo, ILogger<AddressService> logger, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _addressRepo = addressRepo;
            _logger = logger;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<AddressDto>> GetAllCustomerAddresses(int userId, CancellationToken ct = default)
        {
            var addresses = await _addressRepo.GetAllCustomerAddressesAsync(userId, ct);            
            return _mapper.Map<IEnumerable<AddressDto>>(addresses);
        }

        public async Task<AddressDto> GetCustomerAddressById(int userId, int addressId, CancellationToken ct = default)
        {
            var address = await _addressRepo.GetCustomerAddressAsync(userId, addressId, ct);

            if (address == null)
            {
                _logger.LogInformation("Adresa sa ID-jem {AddressId} ne postoji.", addressId);
                throw new NotFoundException($"Adresa sa ID-jem {addressId} nije pronađena.");
            }

            return _mapper.Map<AddressDto>(address);
        }

        public async Task<AddressDto> CreateCustomerAddress(int userId, CreateAddressDto addressDto, CancellationToken ct = default)
        {
            ValidateAddressDto(addressDto);

            var existingAddresses = await _addressRepo.GetAllCustomerAddressesAsync(userId, ct);
            var shouldBeDefault = addressDto.IsDefault || !existingAddresses.Any();

            if (shouldBeDefault)
                await _addressRepo.ResetDefaultAddressesAsync(userId, ct);

            var address = new Address
            {
                Street = addressDto.Street.Trim(),
                HouseNumber = addressDto.HouseNumber.Trim(),
                PostalCode = string.IsNullOrWhiteSpace(addressDto.PostalCode)
                    ? null
                    : addressDto.PostalCode.Trim(),
               City = addressDto.City.Trim(),
               Label = string.IsNullOrWhiteSpace(addressDto.Label)
                    ? null
                    : addressDto.Label.Trim(),
               Note = string.IsNullOrWhiteSpace(addressDto.Note)
                    ? null
                    : addressDto.Note.Trim(),
                IsDefault = shouldBeDefault,
                CustomerId = userId
            };

            await _addressRepo.AddCustomerAddressAsync(address, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            
            _logger.LogInformation("Kreirana nova adresa sa ID-jem {AddressId} za korisnika sa ID-jem {userId}.", address.Id, userId);

            return _mapper.Map<AddressDto>(address);
        }

        public async Task<AddressDto> UpdateCustomerAddress(int userId, int addressId, UpdateAddressDto addressDto, CancellationToken ct = default)
        {
            ValidateAddressDto(addressDto);

            var address = await _addressRepo.UpdateCustomerAddressAsync(userId, addressId, addressDto, ct);

            if (address == null)
            {
                _logger.LogInformation("Adresa sa ID-jem {AddressId} nije pronađena za korisnika sa ID-jem {userId}.", addressId, userId);
                throw new NotFoundException($"Adresa sa ID-jem {addressId} nije pronađena.");
            }

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation("Adresa sa ID-jem {AddressId} uspešno ažurirana za korisnika sa ID-jem {userId}.", addressId, userId);

            return _mapper.Map<AddressDto>(address);
        }

        public async Task DeleteAddressAsync(int userId, int addressId, CancellationToken ct = default)
        {
            var deleted = await _addressRepo.DeleteCustomerAddressAsync(userId, addressId, ct);

            if (!deleted)
            {
                _logger.LogInformation("Adresa sa ID-jem {AddressId} ne postoji.", addressId);
                throw new NotFoundException($"Adresa sa ID-jem {addressId} nije pronađena.");
            }

            await _unitOfWork.SaveChangesAsync(ct);
        }

        private static void ValidateAddressDto(AddressUpsertDto addressDto)
        {
            if (addressDto is null)
                throw new BadRequestException("Podaci za adresu su obavezni.");

            if (string.IsNullOrWhiteSpace(addressDto.Street))
                throw new BadRequestException("Adresa mora imati naziv ulice.");

            if (string.IsNullOrWhiteSpace(addressDto.HouseNumber))
                throw new BadRequestException("Adresa mora imati kućni broj.");

            if (string.IsNullOrWhiteSpace(addressDto.City))
                throw new BadRequestException("Adresa mora imati naziv grada.");

            if (addressDto.Street.Length > 100)
                throw new BadRequestException("Naziv ulice može imati najviše 100 karaktera.");

            if (addressDto.HouseNumber.Length > 20)
                throw new BadRequestException("Kućni broj može imati najviše 20 karaktera.");

            if (addressDto.PostalCode?.Length > 20)
                throw new BadRequestException("Poštanski broj može imati najviše 20 karaktera.");

            if (addressDto.City.Length > 100)
                throw new BadRequestException("Naziv grada može imati najviše 100 karaktera.");

            if (addressDto.Label?.Length > 50)
                throw new BadRequestException("Naziv adrese može imati najviše 50 karaktera.");

            if (addressDto.Note?.Length > 200)
                throw new BadRequestException("Napomena može imati najviše 200 karaktera.");
        }
    }
}
