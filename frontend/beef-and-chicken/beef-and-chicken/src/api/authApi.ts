import api from "./https";
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  UpdatePhoneNumberRequestDto,
  UserProfileDto,
} from "../auth/auth.types";

export async function login(data: LoginRequestDto) {
  const res = await api.post<AuthResponseDto>("/auth/login", data);
  return res.data;
}

export async function register(data: RegisterRequestDto) {
  const res = await api.post("/auth/register", data);
  return res.data;
}

export async function getProfile() {
  const res = await api.get<UserProfileDto>("/auth/profile");
  return res.data;
}

export async function updatePhoneNumber(data: UpdatePhoneNumberRequestDto) {
  const res = await api.patch<UserProfileDto>(
    "/auth/profile/phone-number",
    data,
  );

  return res.data;
}
