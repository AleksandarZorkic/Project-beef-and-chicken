namespace beef_and_chicken.Application.DTOs
{
    public class DeliveryRushInputDto
    {
        public int Tick { get; set; }

        public string Action { get; set; }
            = string.Empty;

        public int? Direction { get; set; }
    }
}