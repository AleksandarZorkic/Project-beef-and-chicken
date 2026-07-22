using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace beef_and_chicken.Presentation.Hubs
{
    [Authorize]
    public class OrderHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrWhiteSpace(userId))
            {
                if (Context.User!.IsInRole(AppRoles.Customer))
                {
                    await Groups.AddToGroupAsync(
                        Context.ConnectionId,
                        $"customer:{userId}"
                    );
                }

                if (Context.User.IsInRole(AppRoles.Courier))
                {
                    await Groups.AddToGroupAsync(
                        Context.ConnectionId,
                        "couriers"
                    );

                    await Groups.AddToGroupAsync(
                        Context.ConnectionId,
                        $"courier:{userId}"
                    );
                }

                if (
                    Context.User.IsInRole(AppRoles.Admin) ||
                    Context.User.IsInRole(AppRoles.Employee)
                )
                {
                    await Groups.AddToGroupAsync(
                        Context.ConnectionId,
                        "operations"
                    );
                }
            }

            await base.OnConnectedAsync();
        }
    }
}