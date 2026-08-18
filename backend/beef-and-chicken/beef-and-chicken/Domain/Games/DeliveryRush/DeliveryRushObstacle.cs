namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed record DeliveryRushObstacle(
        int Tick,
        int BlockedLaneMask,
        DeliveryRushObstacleType Type);
}