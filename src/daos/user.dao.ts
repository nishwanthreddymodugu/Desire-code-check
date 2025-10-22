import { User } from '../models/user';
import { IUserCreate } from '../interfaces/user.interface';

class UserDAO {
  async create(userData: IUserCreate): Promise<User> {
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
  
    await User.update({ refreshToken }, { where: { userId: userId } });
  }
}

export default new UserDAO();
