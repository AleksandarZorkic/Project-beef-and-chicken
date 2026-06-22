using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAllergenService
    {

        Task<List<AllergenDto>> GetAllAsync(CancellationToken ct = default);
        Task<AllergenDto?> GetByIdAsync(int allergenId, CancellationToken ct = default);
        Task<AllergenDto> CreateAsync(CreateAllergenDto data, CancellationToken ct = default);
        Task<AllergenDto> UpdateAsync(int allergenId, UpdateAllergenDto data, CancellationToken ct = default);
        Task DeleteAsync(int allergenId, CancellationToken ct = default);
    
    }
}
