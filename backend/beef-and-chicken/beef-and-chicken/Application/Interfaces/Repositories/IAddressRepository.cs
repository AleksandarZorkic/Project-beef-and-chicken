using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IAddressRepository
    {
        Task<Address?> GetCustomerAddressAsync(int addressId, int customerId, CancellationToken ct = default);
    }
}
