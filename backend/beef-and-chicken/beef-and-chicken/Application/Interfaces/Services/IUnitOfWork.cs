namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
