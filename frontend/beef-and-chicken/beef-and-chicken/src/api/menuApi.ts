import api from "./http";

// Baci pogled na Swager kako bi znao koje atribute vraca da li PascalCase ilicamelCase.
export interface DishMenuDto {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  categoryName: string;
  allergens: DishAllergenDto[];
}

export interface DishAllergenDto {
  allergenId: number;
  allergenName: string;
  isTrace: boolean;
}

export interface CategoryMenuDto {
  id: number;
  name: string;
  description?: string;
  sortOrder: number;
}

const menuResource = "/menu";
const dishResource = (id: number) => `/menu/${id}`;

export async function getMenu() {
  const response = await api.get<DishMenuDto[]>(menuResource);
  return response.data;
}

export async function getDishById(id: number) {
  const response = await api.get<DishMenuDto>(dishResource(id));
  return response.data;
}
