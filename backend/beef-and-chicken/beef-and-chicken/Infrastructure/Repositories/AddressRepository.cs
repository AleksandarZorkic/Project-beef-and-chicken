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
            var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.CustomerId == customerId, ct);

            if (address == null)
                return null;

            if (dto.IsDefault)
            {
                var otherAddresses = await _context.Addresses
                    .Where(a => a.CustomerId == customerId && a.Id != addressId)
                    .ToListAsync(ct);

                foreach (var other in otherAddresses)
                    other.IsDefault = false;
            }

            address.Street = dto.Street;
            address.HouseNumber = dto.HouseNumber;
            address.PostalCode = dto.PostalCode;
            address.City = dto.City;
            address.Label = dto.Label;
            address.Note = dto.Note;
            address.IsDefault = dto.IsDefault;

            return address;
        }

        public async Task<bool> DeleteCustomerAddressAsync(int customerId, int addressId, CancellationToken ct = default)
        {
            var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.CustomerId == customerId, ct);

            if (address == null)
                return false; 

            if (address.IsDefault)
            {
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
            var addresses = await _context.Addresses
                .Where(a => a.CustomerId == customerId && a.IsDefault)
                .ToListAsync(ct);

            foreach (var address in addresses)
                address.IsDefault = false;
        }
    }
}
