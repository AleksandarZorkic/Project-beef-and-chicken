import api from "./https";
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  UpdatePhoneNumberRequestDto,
  UpdateUserProfileRequestDto,
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

export async function updateProfile(data: UpdateUserProfileRequestDto) {
  const res = await api.put<UserProfileDto>("/auth/profile", data);
  return res.data;
}

export async function updatePhoneNumber(data: UpdatePhoneNumberRequestDto) {
  const res = await api.patch<UserProfileDto>(
    "/auth/profile/phone-number",
    data,
  );

  return res.data;
}

export async function uploadProfilePicture(file: File) {
  const formData = new FormData();

  formData.append("image", file);

  const res = await api.post<UserProfileDto>(
    "/auth/profile/picture",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
}
