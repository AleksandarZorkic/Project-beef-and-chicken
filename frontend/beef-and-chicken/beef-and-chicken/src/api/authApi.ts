import api from "./https";
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
} from "../auth/auth.types";

export async function login(data: LoginRequestDto) {
  const res = await api.post<AuthResponseDto>("/auth/login", data);
  return res.data;
}

export async function register(data: RegisterRequestDto) {
  const res = await api.post("/auth/register", data);
  return res.data;
}
