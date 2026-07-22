using AutoMapper;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Application.DTOs;
using Microsoft.AspNetCore.Identity;

namespace beef_and_chicken.Application.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Menu mappings
            CreateMap<Dish, DishMenuDto>()
                .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Category.Name))
                .ForMember(d => d.Allergens, opt => opt.MapFrom(s => s.DishAllergens));

            CreateMap<DishAllergen, DishAllergenDto>()
                .ForMember(d => d.AllergenId, opt => opt.MapFrom(s => s.Allergen.Id))
                .ForMember(d => d.AllergenName, opt => opt.MapFrom(s => s.Allergen.Name))
                .ForMember(d => d.IsTrace, opt => opt.MapFrom(s => s.IsTrace));

            // Address mappings
            CreateMap<Address, AddressDto>();

            // Order address snapshot
            CreateMap<OrderAddressSnapshot, OrderAddressSnapshotDto>();

            // Order item snapshot
            CreateMap<OrderItem, OrderItemDto>()
                .ForMember(d => d.DishName, opt => opt.MapFrom(s => s.DishName))
                .ForMember(d => d.Options, opt => opt.MapFrom(s => s.Options));

            CreateMap<OrderItemOption, OrderItemOptionDto>();

            CreateMap<Order, OrderDetailsDto>()
                .ForMember(d => d.Items, opt => opt.MapFrom(s => s.OrderItems))
                .ForMember(d => d.DeliveryAddress, opt => opt.MapFrom(s => s.DeliveryAddress));

            CreateMap<RegistrationDto, User>()
                .ForMember(d => d.UserName, opt => opt.MapFrom(s => s.UserName))
                .ForMember(d => d.FirstName, opt => opt.MapFrom(s => s.FirstName))
                .ForMember(d => d.LastName, opt => opt.MapFrom(s => s.LastName));

            // Allergen mappings
            CreateMap<Allergen, AllergenDto>();

            CreateMap<CreateAllergenDto, Allergen>()
                .ForMember(d => d.Name, opt => opt.MapFrom(s => s.Name.Trim()));

            CreateMap<UpdateAllergenDto, Allergen>()
                .ForMember(d => d.Name, opt => opt.MapFrom(s => s.Name.Trim()));

            // DishOption mappings
            CreateMap<DishOption, DishOptionDto>();

            CreateMap<CreateDishOptionDto, DishOption>()
                .ForMember(d => d.Name, opt => opt.MapFrom(s => s.Name.Trim()));

            CreateMap<UpdateDishOptionDto, DishOption>()
                .ForMember(d => d.Name, opt => opt.MapFrom(s => s.Name.Trim()));
        }
    }
}
