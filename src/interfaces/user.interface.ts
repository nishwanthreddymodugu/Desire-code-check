export interface IUser {
  id?: number;
  name: string;
  email: string;
  password: string;
  mobile?: string;
  role?: 'admin' | 'user';
  refreshToken?: string;
}
