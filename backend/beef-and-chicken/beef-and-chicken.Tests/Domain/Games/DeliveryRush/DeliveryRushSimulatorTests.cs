using beef_and_chicken.Domain.Games.DeliveryRush;
using Xunit;

namespace beef_and_chicken.Tests.Domain.Games.DeliveryRush
{
    public class DeliveryRushSimulatorTests
    {
        private readonly DeliveryRushSimulator _simulator = new();

        [Fact]
        public void Simulate_WithSameSeedAndInputs_ReturnsSameResult()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(120, -1),
                new(300, 1),
                new(700, 1),
                new(900, -1)
            };

            var firstResult = _simulator.Simulate(123456, inputs);
            var secondResult = _simulator.Simulate(123456, inputs);

            Assert.Equal(firstResult, secondResult);
        }

        [Fact]
        public void Simulate_WithKnownSeed_ReturnsExpectedResult()
        {
            var result = _simulator.Simulate(
                123456,
                Array.Empty<DeliveryRushInput>());

            Assert.Equal(341, result.Score);
            Assert.Equal(431, result.Distance);
            Assert.Equal(2, result.AvoidedObstacles);
            Assert.Equal(3, result.CollisionCount);
            Assert.Equal(2, result.MaxCombo);
            Assert.Equal(259, result.CompletedTicks);
        }

        [Fact]
        public void Simulate_WithDirectionZero_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(0, 0)
            };

            Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));
        }

        [Fact]
        public void Simulate_WithUnorderedTicks_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(300, -1),
                new(120, 1)
            };

            Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));
        }

        [Fact]
        public void Simulate_WithInputsTooClose_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(100, -1),
                new(101, 1)
            };

            Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));
        }

        [Fact]
        public void DifficultyRules_IncreaseTwoLaneBlockChanceOverTime()
        {
            Assert.Equal(
                20,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(0));

            Assert.Equal(
                32,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(600));

            Assert.Equal(
                45,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(1200));

            Assert.Equal(
                58,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(1800));

            Assert.Equal(
                72,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(2400));

            Assert.Equal(
                85,
                DeliveryRushGameRules.GetTwoLaneBlockChancePercent(3000));
        }
    }
}