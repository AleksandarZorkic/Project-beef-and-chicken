using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Route("api/customers/{customerId:int}/addresses")]
    public class AddressController : ControllerBase
    {
        private readonly IAddressService _addressService;

        public AddressController(IAddressService addressService) => _addressService = addressService;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AddressDto>>> GetAllAddresses(
            [FromRoute]int customerId, 
            CancellationToken ct = default)
        {
            var addresses = await _addressService.GetAllCustomerAddresses(customerId, ct);
            return Ok(addresses);
        }

        [HttpGet("{addressId:int}")]
        
        public async Task<ActionResult<AddressDto>> GetAddressById(
            [FromRoute] int customerId, 
            [FromRoute] int addressId, 
            CancellationToken ct = default)
        {
            var address = await _addressService.GetCustomerAddressById(customerId, addressId, ct);
            return Ok(address);
        }

        [HttpPost]
        public async Task<ActionResult<AddressDto>> CreateAddress(
            [FromRoute] int customerId, 
            [FromBody] CreateAddressDto addressDto, 
            CancellationToken ct = default)
        {
            var newAddress = await _addressService.CreateCustomerAddress(customerId, addressDto, ct);

            return CreatedAtAction(nameof(GetAddressById), new { customerId, addressId = newAddress.Id }, newAddress);
        }

        [HttpPut("{addressId:int}")]
        public async Task<ActionResult<AddressDto>> UpdateAddress(
            [FromRoute] int customerId, 
            [FromRoute] int addressId, 
            [FromBody]UpdateAddressDto addressDto, 
            CancellationToken ct = default)
        {
            var updatedAddress = await _addressService.UpdateCustomerAddress(customerId, addressId, addressDto, ct);
            return Ok(updatedAddress); 
        }

        [HttpDelete("{addressId:int}")]
        public async Task<IActionResult> DeleteAddress(
            [FromRoute] int customerId, 
            [FromRoute] int addressId, 
            CancellationToken ct = default)
        {
            await _addressService.DeleteAddressAsync(customerId, addressId, ct);
            return NoContent();
        }
    }
}
