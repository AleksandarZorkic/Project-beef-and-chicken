using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/addresses")]
    public class AddressController : ControllerBase
    {
        private readonly IAddressService _addressService;

        public AddressController(IAddressService addressService) => _addressService = addressService;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AddressDto>>> GetAllAddresses(CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var addresses = await _addressService.GetAllCustomerAddresses(userId, ct);

            return Ok(addresses);
        }

        [HttpGet("{addressId:int}")]       
        public async Task<ActionResult<AddressDto>> GetAddressById(int addressId, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var address = await _addressService.GetCustomerAddressById(userId, addressId, ct);

            return Ok(address);
        }

        [HttpPost]
        public async Task<ActionResult<AddressDto>> CreateAddress([FromBody]CreateAddressDto addressDto, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var newAddress = await _addressService.CreateCustomerAddress(userId, addressDto, ct);

            return CreatedAtAction(nameof(GetAddressById), new {addressId = newAddress.Id }, newAddress);
        }

        [HttpPut("{addressId:int}")]
        public async Task<ActionResult<AddressDto>> UpdateAddress(int addressId, [FromBody]UpdateAddressDto addressDto, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var updatedAddress = await _addressService.UpdateCustomerAddress(userId, addressId, addressDto, ct);

            return Ok(updatedAddress); 
        }

        [HttpDelete("{addressId:int}")]
        public async Task<IActionResult> DeleteAddress(int addressId, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            await _addressService.DeleteAddressAsync(userId, addressId, ct);

            return NoContent();
        }

        private int GetCurrentUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId) || !int.TryParse(userId, out var parsedUserId))
                throw new UnauthorizedAccessException("Nevažeći korisnički identitet.");

            return parsedUserId;
        }
    }
}
