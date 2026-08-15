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
                new(
                    120,
                    DeliveryRushInput.MoveAction,
                    -1),
                new(
                    300,
                    DeliveryRushInput.MoveAction,
                    1),
                new(
                    700,
                    DeliveryRushInput.MoveAction,
                    1),
                new(
                    900,
                    DeliveryRushInput.MoveAction,
                    -1)
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

            Assert.Equal(333, result.Score);
            Assert.Equal(423, result.Distance);
            Assert.Equal(2, result.AvoidedObstacles);
            Assert.Equal(3, result.CollisionCount);
            Assert.Equal(2, result.MaxCombo);
            Assert.Equal(255, result.CompletedTicks);
        }

        [Fact]
        public void Simulate_WithDirectionZero_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    0,
                    DeliveryRushInput.MoveAction,
                    0)
            };

            Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));
        }

        [Fact]
        public void Simulate_WithUnorderedTicks_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    300,
                    DeliveryRushInput.MoveAction,
                    -1),
                new(
                    120,
                    DeliveryRushInput.MoveAction,
                    1)
            };

            Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));
        }

        [Fact]
        public void Simulate_WithInputsTooClose_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    100,
                    DeliveryRushInput.MoveAction,
                    -1),
                new(
                    101,
                    DeliveryRushInput.MoveAction,
                    1)
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

        [Fact]
        public void IsJumpActive_KeepsJumpActiveForExactlyEighteenTicks()
        {
            const int jumpStartTick = 100;

            Assert.False(
                DeliveryRushSimulator.IsJumpActive(
                    99,
                    jumpStartTick));

            Assert.True(
                DeliveryRushSimulator.IsJumpActive(
                    100,
                    jumpStartTick));

            Assert.True(
                DeliveryRushSimulator.IsJumpActive(
                    117,
                    jumpStartTick));

            Assert.False(
                DeliveryRushSimulator.IsJumpActive(
                    118,
                    jumpStartTick));

            Assert.False(
                DeliveryRushSimulator.IsJumpActive(
                    100,
                    null));
        }

        [Fact]
        public void Simulate_WithJumpOnCooldown_ThrowsArgumentException()
        {
            var inputs = new List<DeliveryRushInput>
                {
                    new(
                        100,
                        DeliveryRushInput.JumpAction,
                        null),

                    new(
                        129,
                        DeliveryRushInput.JumpAction,
                        null)
                };

            var exception = Assert.Throws<ArgumentException>(() =>
                _simulator.Simulate(123456, inputs));

            Assert.Contains(
                "Jump is still on cooldown.",
                exception.Message);
        }

        [Fact]
        public void Simulate_WithJumpAfterCooldown_DoesNotThrow()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    100,
                    DeliveryRushInput.JumpAction,
                    null),

                new(
                    130,
                    DeliveryRushInput.JumpAction,
                    null)
            };

            var exception = Record.Exception(() =>
                _simulator.Simulate(123456, inputs));

            Assert.Null(exception);
        }

        [Fact]
        public void SimulateUntilTick_WhenJumpStartsAfterContact_RegistersCollision()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    87,
                    DeliveryRushInput.JumpAction,
                    null)
            };

            var result = _simulator.SimulateUntilTick(
                123456,
                inputs,
                95);

            Assert.Equal(1, result.CollisionCount);
            Assert.Equal(0, result.AvoidedObstacles);
        }

        [Fact]
        public void SimulateUntilTick_WhenJumpEndsDuringContact_RegistersCollision()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    76,
                    DeliveryRushInput.JumpAction,
                    null)
            };

            var result = _simulator.SimulateUntilTick(
                123456,
                inputs,
                95);

            Assert.Equal(1, result.CollisionCount);
            Assert.Equal(0, result.AvoidedObstacles);
        }

        [Fact]
        public void SimulateUntilTick_WhenJumpCoversEntireContact_AvoidsObstacle()
        {
            var inputs = new List<DeliveryRushInput>
            {
                new(
                    80,
                    DeliveryRushInput.JumpAction,
                    null)
            };

            var result = _simulator.SimulateUntilTick(
                123456,
                inputs,
                95);

            Assert.Equal(0, result.CollisionCount);
            Assert.Equal(1, result.AvoidedObstacles);
        }
    }
}