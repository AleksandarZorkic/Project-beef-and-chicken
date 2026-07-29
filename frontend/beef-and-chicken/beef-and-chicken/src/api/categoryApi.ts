import api from "./https";

export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
  dishCount: number;
  activeDishCount: number;
}

export interface CreateCategoryDto {
  name: string;
  description?: string | null;
  sortOrder: number;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
}

export interface UpdateCategoryDto {
  name: string;
  description?: string | null;
  sortOrder: number;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
}

const ADMIN_CATEGORIES_ENDPOINT = "/admin/categories";

export async function getAdminCategories() {
  const res = await api.get<CategoryDto[]>(ADMIN_CATEGORIES_ENDPOINT);
  return res.data;
}

export async function getActiveAdminCategories() {
  const res = await api.get<CategoryDto[]>(
    `${ADMIN_CATEGORIES_ENDPOINT}/active`,
  );

  return res.data;
}

export async function getAdminCategoryById(categoryId: number) {
  const res = await api.get<CategoryDto>(
    `${ADMIN_CATEGORIES_ENDPOINT}/${categoryId}`,
  );

  return res.data;
}

export async function createCategory(dto: CreateCategoryDto) {
  const res = await api.post<CategoryDto>(ADMIN_CATEGORIES_ENDPOINT, dto);
  return res.data;
}

export async function updateCategory(
  categoryId: number,
  dto: UpdateCategoryDto,
) {
  const res = await api.put<CategoryDto>(
    `${ADMIN_CATEGORIES_ENDPOINT}/${categoryId}`,
    dto,
  );

  return res.data;
}

export async function activateCategory(categoryId: number) {
  const res = await api.patch<CategoryDto>(
    `${ADMIN_CATEGORIES_ENDPOINT}/${categoryId}/activate`,
  );

  return res.data;
}

export async function deactivateCategory(categoryId: number) {
  await api.patch(`${ADMIN_CATEGORIES_ENDPOINT}/${categoryId}/deactivate`);
}

export async function deleteCategory(categoryId: number) {
  await api.delete(`${ADMIN_CATEGORIES_ENDPOINT}/${categoryId}`);
}
