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
            CreateMap<Dish, DishMenuDto>();
            CreateMap<DishAllergen, DishAllergenDto>();

            // Address snapshot
            CreateMap<OrderAddressSnapshot, AddressDto>().ReverseMap();

            CreateMap<Address, AddressDto>().ReverseMap();

            CreateMap<OrderItem, OrderItemDto>()
                .ForMember(d => d.DishName, opt => opt.MapFrom(s => s.Dish.Name));

            CreateMap<Order, OrderDetailsDto>()
                .ForMember(d => d.Items, opt => opt.MapFrom(s => s.OrderItems))
                .ForMember(d => d.DeliveryAddress, opt => opt.MapFrom(s => s.DeliveryAddress));

            CreateMap<RegistrationDto, User>()
                .ForMember(d => d.UserName, opt => opt.MapFrom(s => s.Username))
                .ForMember(d => d.FirstName, opt => opt.MapFrom(s => s.FirstName))
                .ForMember(d => d.LastName, opt => opt.MapFrom(s => s.LastName)); 
        }
    }
}
