import api from "./https";

export type DayOfWeekName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface RestaurantWorkingHourDto {
  dayOfWeek: DayOfWeekName;
  dayName: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  closesNextDay: boolean;
}

export interface UpdateRestaurantWorkingHourRequest {
  dayOfWeek: DayOfWeekName;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  closesNextDay: boolean;
}

export interface RestaurantOpenStatusDto {
  isOpen: boolean;
  message: string;
  currentTime: string;
  todayWorkingHours: string;
  nextOpeningText?: string | null;
}

export interface RestaurantSettingsDto {
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  isDeliveryEnabled: boolean;
  updatedAt: string;
  workingHours: RestaurantWorkingHourDto[];
  restaurantStatus: RestaurantOpenStatusDto;
}

export interface UpdateRestaurantSettingsRequest {
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  isDeliveryEnabled: boolean;
  workingHours?: UpdateRestaurantWorkingHourRequest[];
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
