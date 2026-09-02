export type UserRole = 'DRIVER' | 'POLICE' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  nic: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
