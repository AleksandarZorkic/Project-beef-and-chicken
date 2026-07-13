namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface ICurrentUserService
    {
        int? UserId { get; }
        string UserName { get; }
        string? IpAddress { get; }
        string? UserAgent { get; }
    }
}