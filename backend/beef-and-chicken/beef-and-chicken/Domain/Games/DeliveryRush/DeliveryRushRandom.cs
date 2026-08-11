namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed class DeliveryRushRandom
    {
        private uint _state;

        public DeliveryRushRandom(int seed)
        {
            _state = unchecked((uint)seed);

            if (_state == 0)
            {
                _state = 0x6D2B79F5;
            }
        }

        public uint NextUInt()
        {
            var value = _state;

            value ^= value << 13;
            value ^= value >> 17;
            value ^= value << 5;

            _state = value;

            return value;
        }

        public int NextInt(int exclusiveMaximum)
        {
            if (exclusiveMaximum <= 0)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(exclusiveMaximum));
            }

            return (int)(NextUInt() % (uint)exclusiveMaximum);
        }
    }
}