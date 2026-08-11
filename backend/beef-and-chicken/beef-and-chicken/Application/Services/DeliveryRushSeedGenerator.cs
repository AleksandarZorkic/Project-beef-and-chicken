using System.Security.Cryptography;
using beef_and_chicken.Application.Interfaces.Services;

namespace beef_and_chicken.Infrastructure.Services
{
    public sealed class DeliveryRushSeedGenerator
        : IDeliveryRushSeedGenerator
    {
        public int Generate()
        {
            return RandomNumberGenerator.GetInt32(
                1,
                int.MaxValue);
        }
    }
}