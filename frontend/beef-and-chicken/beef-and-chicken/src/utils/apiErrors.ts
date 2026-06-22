import axios from "axios";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (!data) {
      return "Server nije vratio detalje o grešci.";
    }

    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof data.title === "string" && data.title.trim() && !data.errors) {
      return data.title;
    }

    if (data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors)
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((msg): msg is string => typeof msg === "string");

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    return "Došlo je do greške pri obradi zahteva.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Došlo je do nepoznate greške.";
}
