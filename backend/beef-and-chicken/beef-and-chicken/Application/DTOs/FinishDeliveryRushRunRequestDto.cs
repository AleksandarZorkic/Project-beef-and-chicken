namespace beef_and_chicken.Application.DTOs
{
    public class FinishDeliveryRushRunRequestDto
    {
        public List<DeliveryRushInputDto> Inputs { get; set; }
            = new List<DeliveryRushInputDto>();
    }
}