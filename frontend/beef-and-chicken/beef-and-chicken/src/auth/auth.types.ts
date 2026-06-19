export type AuthUser = {
  id: number;
  username?: string;
  roles: string[];
};

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePicture?: string | null;
};

export type AuthResponseDto = {
  token: string;
};
