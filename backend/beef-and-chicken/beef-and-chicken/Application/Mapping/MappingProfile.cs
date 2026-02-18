using AutoMapper;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Application.DTOs;

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
            CreateMap<OrderAddressSnapshot, OrderAddressDto>().ReverseMap();

            CreateMap<OrderItem, OrderItemDto>()
                .ForMember(d => d.DishName, opt => opt.MapFrom(s => s.Dish.Name));

            CreateMap<Order, OrderDetailsDto>()
                .ForMember(d => d.Items, opt => opt.MapFrom(s => s.OrderItems))
                .ForMember(d => d.DeliveryAddress, opt => opt.MapFrom(s => s.DeliveryAddress));

            CreateMap<CreateOrderRequestDto, Order>()
                .ForMember(d => d.Id, opt => opt.Ignore())
                .ForMember(d => d.Subtotal, opt => opt.Ignore())
                .ForMember(d => d.DeliveryFee, opt => opt.Ignore())
                .ForMember(d => d.TotalAmount, opt => opt.Ignore())
                .ForMember(d => d.Status, opt => opt.Ignore())
                .ForMember(d => d.OrderItems, opt => opt.Ignore())
                .ForMember(d => d.DeliveryAddress, opt => opt.Ignore());


        }
    }
}
