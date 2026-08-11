using beef_and_chicken.Application.Interfaces.Services;

namespace beef_and_chicken.Tests.TestDoubles
{
    internal sealed class TestDeliveryRushSeedGenerator
        : IDeliveryRushSeedGenerator
    {
        private readonly int _seed;

        public TestDeliveryRushSeedGenerator(int seed)
        {
            _seed = seed;
        }

        public int Generate()
        {
            return _seed;
        }
    }
}