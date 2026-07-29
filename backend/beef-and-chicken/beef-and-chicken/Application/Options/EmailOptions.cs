namespace beef_and_chicken.Application.Options
{
    public class EmailOptions
    {
        public string SmtpHost { get; set; } = string.Empty;

        public int SmtpPort { get; set; } = 587;

        public string Username { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FromEmail { get; set; } = string.Empty;

        public string FromName { get; set; } = "Beef and Chicken";

        public bool EnableSsl { get; set; } = true;

        public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    }
}