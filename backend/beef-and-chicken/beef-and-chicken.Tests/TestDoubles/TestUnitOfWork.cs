using beef_and_chicken.Application.Interfaces.Services;

namespace beef_and_chicken.Tests.TestDoubles
{
    internal sealed class TestUnitOfWork : IUnitOfWork
    {
        public int SaveChangesCallCount { get; private set; }

        public Task<int> SaveChangesAsync(
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            SaveChangesCallCount++;

            return Task.FromResult(1);
        }
    }
}