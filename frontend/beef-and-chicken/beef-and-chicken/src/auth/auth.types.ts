export type LoginRequestDto = {
  userName: string;
  password: string;
};

export interface RegisterRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
  phoneNumber: string;
  profilePicture?: string | null;
}

export type AuthResponseDto = {
  token: string;
};

export interface UserProfileDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  phoneNumber?: string | null;
  roles: string[];
}

export interface UpdatePhoneNumberRequestDto {
  phoneNumber: string;
}
