import axios from "axios";

export type ApiFieldErrors = Record<string, string>;

export function getApiFieldErrors(error: unknown): ApiFieldErrors {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const data = error.response?.data;
  if (!data || typeof data !== "object") {
    return {};
  }

  const result: ApiFieldErrors = {};

  if ("errors" in data && data.errors && typeof data.errors === "object") {
    for (const [key, value] of Object.entries(
      data.errprs as Record<string, unknown>,
    )) {
      if (Array.isArray(value) && value.length > 0) {
        result[key] = String(value[0]);
      }
    }
  }

  return result;
}
