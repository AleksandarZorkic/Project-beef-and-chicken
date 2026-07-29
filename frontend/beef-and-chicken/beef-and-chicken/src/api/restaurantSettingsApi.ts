import api from "./https";

export interface RestaurantSettingsDto {
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  isDeliveryEnabled: boolean;
  updatedAt: string;
}

export interface UpdateRestaurantSettingsRequest {
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  isDeliveryEnabled: boolean;
}

const RESTAURANT_SETTINGS_ENDPOINT = "/restaurant-settings";
const ADMIN_RESTAURANT_SETTINGS_ENDPOINT = "/admin/restaurant-settings";

export async function getRestaurantSettings() {
  const response = await api.get<RestaurantSettingsDto>(
    RESTAURANT_SETTINGS_ENDPOINT,
  );

  return response.data;
}

export async function getAdminRestaurantSettings() {
  const response = await api.get<RestaurantSettingsDto>(
    ADMIN_RESTAURANT_SETTINGS_ENDPOINT,
  );

  return response.data;
}

export async function updateRestaurantSettings(
  data: UpdateRestaurantSettingsRequest,
) {
  const response = await api.put<RestaurantSettingsDto>(
    ADMIN_RESTAURANT_SETTINGS_ENDPOINT,
    data,
  );

  return response.data;
}
