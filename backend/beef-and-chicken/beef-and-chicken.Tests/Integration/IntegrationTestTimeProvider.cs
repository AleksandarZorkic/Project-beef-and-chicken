namespace beef_and_chicken.Tests.Integration
{
    internal sealed class IntegrationTestTimeProvider
        : TimeProvider
    {
        private DateTimeOffset _utcNow;

        public IntegrationTestTimeProvider(
            DateTimeOffset initialTime)
        {
            _utcNow = initialTime;
        }

        public override DateTimeOffset GetUtcNow()
        {
            return _utcNow;
        }

        public void Advance(TimeSpan duration)
        {
            if (duration < TimeSpan.Zero)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(duration));
            }

            _utcNow = _utcNow.Add(duration);
        }
    }
}