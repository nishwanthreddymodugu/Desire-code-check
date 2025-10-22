export interface IUser {
  id?: number;
  name: string;
  email: string;
  password: string;
  mobile?: string;
  role?: 'admin' | 'user';
  refreshToken?: string;
}
export interface IUserCreate {
  name: string;
  email: string;
  hash: string;
  mobile?: string | null;
}
export interface JwtPayload {
  userId: number;
  name: string;
  email: string;
  role?: 'admin' | 'user';
}