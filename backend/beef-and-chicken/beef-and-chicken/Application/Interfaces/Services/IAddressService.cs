using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAddressService
    {
        Task<IEnumerable<AddressDto>> GetAllCustomerAddresses(int customerId, CancellationToken ct = default);
        Task<AddressDto> GetCustomerAddressById(int customerId, int addressId, CancellationToken ct = default);
        Task<AddressDto> CreateCustomerAddress(int customerId, CreateAddressDto addressDto, CancellationToken ct = default);
        Task DeleteAddressAsync(int customerId, int addressId, CancellationToken ct = default);
        Task<AddressDto> UpdateCustomerAddress(int customerId, int addressId, UpdateAddressDto addressDto, CancellationToken ct = default);
    }
}
