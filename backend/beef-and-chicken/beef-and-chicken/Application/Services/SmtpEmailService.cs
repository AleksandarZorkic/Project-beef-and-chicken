using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.Options;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;
using System.Text;

namespace beef_and_chicken.Infrastructure.Services
{
    public class SmtpEmailService : IEmailService
    {
        private readonly EmailOptions _options;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(
            IOptions<EmailOptions> options,
            ILogger<SmtpEmailService> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(
            string toEmail,
            string resetLink,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new InvalidOperationException("Email primaoca nije podešen.");

            if (string.IsNullOrWhiteSpace(_options.SmtpHost))
                throw new InvalidOperationException("SMTP host nije podešen.");

            if (string.IsNullOrWhiteSpace(_options.FromEmail))
                throw new InvalidOperationException("FromEmail nije podešen.");

            var body = BuildPasswordResetBody(resetLink);

            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromEmail, _options.FromName),
                Subject = "Reset lozinke - Beef and Chicken",
                Body = body,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8
            };

            message.To.Add(toEmail);

            using var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
            {
                EnableSsl = _options.EnableSsl,
                Credentials = new NetworkCredential(
                    _options.Username,
                    _options.Password
                )
            };

            await client.SendMailAsync(message, ct);

            _logger.LogInformation(
                "Password reset email sent. ToEmail={ToEmail}",
                toEmail
            );
        }

        private static string BuildPasswordResetBody(string resetLink)
        {
            return $"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Reset lozinke</h2>

                <p>Primili smo zahtev za promenu lozinke za tvoj Beef and Chicken nalog.</p>

                <p>Klikni na dugme ispod da postaviš novu lozinku:</p>

                <p>
                  <a href="{resetLink}"
                     style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
                    Promeni lozinku
                  </a>
                </p>

                <p>Ako ti nisi tražio/la promenu lozinke, ignoriši ovaj email.</p>

                <p style="font-size: 13px; color: #666;">
                  Link važi ograničeno vreme.
                </p>
              </body>
            </html>
            """;
        }
    }
}