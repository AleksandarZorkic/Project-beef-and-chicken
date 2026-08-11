namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed record DeliveryRushSimulationResult(
        int Score,
        int Distance,
        int AvoidedObstacles,
        int CollisionCount,
        int MaxCombo);
}