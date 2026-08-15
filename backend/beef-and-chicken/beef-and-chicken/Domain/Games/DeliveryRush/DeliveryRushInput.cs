namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed record DeliveryRushInput(
        int Tick,
        string Action,
        int? Direction)
    {
        public const string MoveAction = "move";
        public const string JumpAction = "jump";
    }
}