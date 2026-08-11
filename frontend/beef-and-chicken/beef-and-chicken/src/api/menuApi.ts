import api from "./https";

export type DishMenuDto = {
  id: number;
  name: string;
  description?: string | null;
  price: number;

  isOnSale: boolean;
  salePrice?: number | null;
  effectivePrice: number;

  imageUrl?: string | null;
  isRecommended: boolean;
  recommendedSortOrder: number;
  categoryId: number;
  categoryName: string;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
  allergens: DishAllergenDto[];
};

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

export interface UploadDishImageResponseDto {
  imageUrl: string;
}

export type HomepageDishDto = {
  id: number;
  name: string;
  description?: string | null;
  price: number;

  isOnSale: boolean;
  salePrice?: number | null;
  effectivePrice: number;

  imageUrl?: string | null;
  categoryId: number;
  categoryName: string;
  soldQuantity?: number | null;
};

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

export async function uploadDishImage(dishId: number, image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const res = await api.post<UploadDishImageResponseDto>(
    `/menu/${dishId}/image`,
    formData,
  );

  return res.data;
}

export async function getBestSellers(limit = 6, days = 30) {
  const response = await api.get<HomepageDishDto[]>("/menu/best-sellers", {
    params: {
      limit,
      days,
    },
  });

  return response.data;
}

export async function getRecommendedDishes(limit = 6) {
  const response = await api.get<HomepageDishDto[]>("/menu/recommended", {
    params: {
      limit,
    },
  });

  return response.data;
}
