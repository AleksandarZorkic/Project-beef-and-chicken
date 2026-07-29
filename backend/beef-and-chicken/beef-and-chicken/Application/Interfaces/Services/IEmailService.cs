namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(
            string toEmail,
            string resetLink,
            CancellationToken ct = default
        );
    }
}