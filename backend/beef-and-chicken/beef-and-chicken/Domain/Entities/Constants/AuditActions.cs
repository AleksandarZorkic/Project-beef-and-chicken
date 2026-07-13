namespace beef_and_chicken.Domain.Entities.Constants
{
    public static class AuditActions
    {
        public const string CreateUser = "CreateUser";
        public const string UpdateUser = "UpdateUser";
        public const string UpdateUserRoles = "UpdateUserRoles";
        public const string BlockUser = "BlockUser";
        public const string UnblockUser = "UnblockUser";
        public const string AnonymizeUser = "AnonymizeUser";

        public const string CreateDish = "CreateDish";
        public const string UpdateDish = "UpdateDish";
        public const string ActivateDish = "ActivateDish";
        public const string DeactivateDish = "DeactivateDish";

        public const string UpdateOrderStatus = "UpdateOrderStatus";
    }
}