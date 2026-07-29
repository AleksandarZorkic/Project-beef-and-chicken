import api from "./https";
import type { DishMenuDto } from "./menuApi";

export type DishAllergenInput = {
  allergenId: number;
  isTrace: boolean;
};

export type CreateDishRequest = {
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  isRecommended: boolean;
  recommendedSortOrder: number;
  categoryId: number;
  allergens: DishAllergenInput[];
};

export type UpdateDishRequest = CreateDishRequest;

export type UploadDishImageResponse = {
  imageUrl: string;
};

const DISHES_ENDPOINT = "/admin/dishes";

export async function createDish(data: CreateDishRequest) {
  const response = await api.post<DishMenuDto>(DISHES_ENDPOINT, data);
  return response.data;
}

export async function updateDish(id: number, data: UpdateDishRequest) {
  const response = await api.put<DishMenuDto>(`${DISHES_ENDPOINT}/${id}`, data);
  return response.data;
}

export async function uploadDishImage(id: number, image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const response = await api.post<UploadDishImageResponse>(
    `${DISHES_ENDPOINT}/${id}/image`,
    formData,
  );

  return response.data;
}

export async function getInactiveDishes() {
  const response = await api.get<DishMenuDto[]>(`${DISHES_ENDPOINT}/inactive`);
  return response.data;
}

export async function deactivateDishAdmin(id: number) {
  await api.patch(`${DISHES_ENDPOINT}/${id}/deactivate`);
}

export async function activateDish(id: number) {
  const response = await api.patch<DishMenuDto>(
    `${DISHES_ENDPOINT}/${id}/activate`,
  );

  return response.data;
}
