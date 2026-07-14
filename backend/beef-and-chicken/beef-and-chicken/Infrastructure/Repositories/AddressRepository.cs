using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class AddressRepository : IAddressRepository
    {
        private readonly AppDbContext _context;

        public AddressRepository(AppDbContext context) => _context = context;

        public async Task<List<Address>> GetAllCustomerAddressesAsync(int customerId, CancellationToken ct = default)
        {
            return await _context.Addresses
                .AsNoTracking()
                .Where(a => a.CustomerId == customerId)
                .OrderByDescending(a => a.IsDefault)
                .ThenBy(a => a.Id)
                .ToListAsync(ct);
        }

        public async Task<Address?> GetCustomerAddressAsync(int customerId, int addressId,  CancellationToken ct = default)
        {
            return await _context.Addresses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == addressId && a.CustomerId == customerId, ct);
        }

        public Task<Address> AddCustomerAddressAsync(Address address, CancellationToken ct = default)
        {
            _context.Addresses.Add(address);
            return Task.FromResult(address);
        }

        public async Task<Address?> UpdateCustomerAddressAsync(int customerId, int addressId, UpdateAddressDto dto, CancellationToken ct = default)
        {
            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == addressId && a.CustomerId == customerId, ct);

            if (address == null)
                return null;

            var wasDefault = address.IsDefault;

            if (dto.IsDefault)
            {
                await ResetDefaultAddressesAsync(customerId, ct);
            }

            var shouldStayDefault = wasDefault && !dto.IsDefault;

            address.Street = dto.Street.Trim();
            address.HouseNumber = dto.HouseNumber.Trim();
            address.PostalCode = string.IsNullOrWhiteSpace(dto.PostalCode)
                ? null
                : dto.PostalCode.Trim();
            address.City = dto.City.Trim();
            address.Label = string.IsNullOrWhiteSpace(dto.Label)
                ? null
                : dto.Label.Trim();
            address.Note = string.IsNullOrWhiteSpace(dto.Note)
                ? null
                : dto.Note.Trim();

            address.IsDefault = dto.IsDefault || shouldStayDefault;

            return address;
        }

        public async Task<bool> DeleteCustomerAddressAsync(int customerId, int addressId, CancellationToken ct = default)
        {
            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == addressId && a.CustomerId == customerId, ct);

            if (address == null)
                return false;

            if (address.IsDefault)
            {
                await _context.Addresses
                    .Where(a => a.Id == addressId && a.CustomerId == customerId)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(a => a.IsDefault, false),
                        ct
                    );

                var nextDefault = await _context.Addresses
                    .Where(a => a.CustomerId == customerId && a.Id != addressId)
                    .OrderBy(a => a.Id)
                    .FirstOrDefaultAsync(ct);

                if (nextDefault != null)
                    nextDefault.IsDefault = true;
            }

            _context.Addresses.Remove(address);
            return true;
        }

        public async Task ResetDefaultAddressesAsync(int customerId, CancellationToken ct = default)
        {
            await _context.Addresses
                .Where(a => a.CustomerId == customerId && a.IsDefault)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(a => a.IsDefault, false),
                    ct
                );
        }
    }
}
