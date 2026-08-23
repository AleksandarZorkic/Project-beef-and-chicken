import api from "./https";

export type DishOptionType =
  | "SideDish"
  | "Spice"
  | "SweetAddition"
  | "SavoryPancakeAddition";

export interface DishOptionDto {
  id: number;
  name: string;
  type: DishOptionType;
  price: number;
  isAlwaysPaid: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateDishOptionRequest {
  name: string;
  type: DishOptionType;
  price: number;
  isAlwaysPaid: boolean;
  sortOrder: number;
}

export interface UpdateDishOptionRequest {
  name: string;
  type: DishOptionType;
  price: number;
  isAlwaysPaid: boolean;
  sortOrder: number;
}

const DISH_OPTIONS_ENDPOINT = "/dish-options";
const ADMIN_DISH_OPTIONS_ENDPOINT = "/admin/dish-options";

export async function getActiveDishOptions() {
  const res = await api.get<DishOptionDto[]>(DISH_OPTIONS_ENDPOINT);
  return res.data;
}

export async function getAdminDishOptions(params?: {
  includeInactive?: boolean;
  type?: DishOptionType;
}) {
  const res = await api.get<DishOptionDto[]>(ADMIN_DISH_OPTIONS_ENDPOINT, {
    params,
  });

  return res.data;
}

export async function createDishOption(data: CreateDishOptionRequest) {
  const res = await api.post<DishOptionDto>(ADMIN_DISH_OPTIONS_ENDPOINT, data);
  return res.data;
}

export async function updateDishOption(
  id: number,
  data: UpdateDishOptionRequest,
) {
  const res = await api.put<DishOptionDto>(
    `${ADMIN_DISH_OPTIONS_ENDPOINT}/${id}`,
    data,
  );

  return res.data;
}

export async function activateDishOption(id: number) {
  const res = await api.patch<DishOptionDto>(
    `${ADMIN_DISH_OPTIONS_ENDPOINT}/${id}/activate`,
  );

  return res.data;
}

export async function deactivateDishOption(id: number) {
  const res = await api.patch<DishOptionDto>(
    `${ADMIN_DISH_OPTIONS_ENDPOINT}/${id}/deactivate`,
  );

  return res.data;
}
