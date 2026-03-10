using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IAddressRepository
    {
        Task<List<Address>> GetAllCustomerAddressesAsync(int customerId, CancellationToken ct = default);
        Task<Address?> GetCustomerAddressAsync(int customerId, int addressId, CancellationToken ct = default);
        Task<Address> AddCustomerAddressAsync(Address address, CancellationToken ct = default);
        Task<Address?> UpdateCustomerAddressAsync(int customerId, int addressId, UpdateAddressDto dto, CancellationToken ct = default);
        Task<bool> DeleteCustomerAddressAsync(int customerId, int addressId, CancellationToken ct = default);
        Task ResetDefaultAddressesAsync(int customerId, CancellationToken ct = default);
    } 
}
