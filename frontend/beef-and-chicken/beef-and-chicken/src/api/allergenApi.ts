import apiClient from "./https";
import type {
  Allergen,
  CreateAllergenRequest,
  UpdateAllergenRequest,
} from "../types/allergen";

const ALLERGENS_ENDPOINT = "/allergens";

export async function getAllergens() {
  const response = await apiClient.get<Allergen[]>(ALLERGENS_ENDPOINT);
  return response.data;
}

export async function createAllergen(data: CreateAllergenRequest) {
  const response = await apiClient.post<Allergen>(ALLERGENS_ENDPOINT, data);
  return response.data;
}

export async function updateAllergen(id: number, data: UpdateAllergenRequest) {
  const response = await apiClient.put<Allergen>(
    `${ALLERGENS_ENDPOINT}/${id}`,
    data,
  );
  return response.data;
}

export async function deleteAllergen(id: number) {
  await apiClient.delete(`${ALLERGENS_ENDPOINT}/${id}`);
}
