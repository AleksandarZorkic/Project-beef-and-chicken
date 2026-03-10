using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using System.ComponentModel.DataAnnotations;

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

        public async Task<IEnumerable<AddressDto>> GetAllCustomerAddresses(int customerId, CancellationToken ct = default)
        {
            var addresses = await _addressRepo.GetAllCustomerAddressesAsync(customerId, ct);            
            return _mapper.Map<IEnumerable<AddressDto>>(addresses);
        }

        public async Task<AddressDto> GetCustomerAddressById(int customerId, int addressId, CancellationToken ct = default)
        {
            var address = await _addressRepo.GetCustomerAddressAsync(customerId, addressId, ct);

            if (address == null)
            {
                _logger.LogInformation("Adresa sa ID-jem {AddressId} ne postoji.", addressId);
                throw new NotFoundException($"Adresa sa ID-jem {addressId} nije pronađena.");
            }

            return _mapper.Map<AddressDto>(address);
        }

        public async Task<AddressDto> CreateCustomerAddress(int customerId, CreateAddressDto addressDto, CancellationToken ct = default)
        {
            ValidateAddressDto(addressDto);

            var existingAddresses = await _addressRepo.GetAllCustomerAddressesAsync(customerId, ct);
            var shouldBeDefault = addressDto.IsDefault || !existingAddresses.Any();

            if (shouldBeDefault)
                await _addressRepo.ResetDefaultAddressesAsync(customerId, ct);

            var address = new Address
            {
                Street = addressDto.Street,
                HouseNumber = addressDto.HouseNumber,
                PostalCode = addressDto.PostalCode,
                City = addressDto.City,
                Label = addressDto.Label,
                Note = addressDto.Note,
                IsDefault = shouldBeDefault,
                CustomerId = customerId
            };

            await _addressRepo.AddCustomerAddressAsync(address, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            
            _logger.LogInformation("Kreirana nova adresa sa ID-jem {AddressId} za korisnika sa ID-jem {CustomerId}.", address.Id, customerId);

            return _mapper.Map<AddressDto>(address);
        }

        public async Task<AddressDto> UpdateCustomerAddress(int customerId, int addressId, UpdateAddressDto addressDto, CancellationToken ct = default)
        {
            ValidateAddressDto(addressDto);

            var address = await _addressRepo.UpdateCustomerAddressAsync(customerId, addressId, addressDto, ct);

            if (address == null)
            {
                _logger.LogInformation("Adresa sa ID-jem {AddressId} nije pronađena za korisnika sa ID-jem {CustomerId}.", addressId, customerId);
                throw new NotFoundException($"Adresa sa ID-jem {addressId} nije pronađena.");
            }

            await _unitOfWork.SaveChangesAsync(ct);

            _logger.LogInformation("Adresa sa ID-jem {AddressId} uspešno ažurirana za korisnika sa ID-jem {CustomerId}.", addressId, customerId);

            return _mapper.Map<AddressDto>(address);
        }

        public async Task DeleteAddressAsync(int customerId, int addressId, CancellationToken ct = default)
        {
            var deleted = await _addressRepo.DeleteCustomerAddressAsync(customerId, addressId, ct);

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
                throw new ArgumentNullException(nameof(addressDto));

            if (string.IsNullOrWhiteSpace(addressDto.Street))
                throw new ValidationException("Adresa mora imati naziv ulice.");

            if (string.IsNullOrWhiteSpace(addressDto.HouseNumber))
                throw new ValidationException("Adresa mora imati kućni broj.");

            if (string.IsNullOrWhiteSpace(addressDto.City))
                throw new ValidationException("Adresa mora imati naziv grada.");
        }
    }
}
