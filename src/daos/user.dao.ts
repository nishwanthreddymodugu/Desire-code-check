import { User } from '../models/user';
import { IUser } from '../interfaces/user.interface';

class UserDAO {
  async create(userData: IUser): Promise<User> {
    return User.create(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    return User.findOne({ where: { refreshToken } });
  }

  async findById(userId: number): Promise<User | null> {
    return User.findByPk(userId);
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    // The User model uses `userId` as the primary key attribute, not `id`.
    await User.update({ refreshToken }, { where: { userId: userId } });
  }
}

export default new UserDAO();
