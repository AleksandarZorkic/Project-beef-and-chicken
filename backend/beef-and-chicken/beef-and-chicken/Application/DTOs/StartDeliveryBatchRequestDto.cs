namespace beef_and_chicken.Application.DTOs
{
    public class StartDeliveryBatchRequestDto
    {
        public List<int> OrderIds { get; set; } = new();
    }
}
