using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class PaymentTransaction
    {
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;

        public PaymentProviderType Provider { get; set; } = PaymentProviderType.Disabled;

        public string? ProviderTransactionId { get; set; }

        public decimal Amount { get; set; }

        public string Currency { get; set; } = "RSD";

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        public string? RedirectUrl { get; set; }

        public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset? PaidAtUtc { get; set; }

        public DateTimeOffset? FailedAtUtc { get; set; }

        public string? FailureReason { get; set; }
    }
}