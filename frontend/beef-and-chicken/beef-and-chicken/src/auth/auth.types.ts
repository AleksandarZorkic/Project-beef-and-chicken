export type LoginRequestDto = {
  userName: string;
  password: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userName: string;
  profilePicture?: string | null;
};

export type AuthResponseDto = {
  token: string;
};
