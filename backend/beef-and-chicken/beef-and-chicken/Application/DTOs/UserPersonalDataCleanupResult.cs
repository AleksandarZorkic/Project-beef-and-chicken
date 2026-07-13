namespace beef_and_chicken.Application.DTOs
{
    public class UserPersonalDataCleanupResult
    {
        public int DeletedAddressesCount { get; set; }

        public int DeletedUserAllergensCount { get; set; }

        public int DeletedRefreshTokensCount { get; set; }

        public bool HadProfilePicture { get; set; }
    }
}