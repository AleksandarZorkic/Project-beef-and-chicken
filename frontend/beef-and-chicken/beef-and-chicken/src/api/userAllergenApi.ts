import api from "./https";
import { Allergen } from "../types/allergen";

const PROFILE_ALLERGENS_ENDPOINT = "/profile/allergens";

export async function getMyAllergens() {
  const response = await api.get<Allergen[]>(PROFILE_ALLERGENS_ENDPOINT);
  return response.data;
}

export async function addAllergenToProfile(allergenId: number) {
  const response = await api.post<Allergen>(
    `${PROFILE_ALLERGENS_ENDPOINT}/${allergenId}`,
  );
  return response.data;
}

export async function removeAllergenFromProfile(allergenId: number) {
  await api.delete(`${PROFILE_ALLERGENS_ENDPOINT}/${allergenId}`);
}
