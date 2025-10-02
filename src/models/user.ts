import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, CreatedAt, UpdatedAt, Unique } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({ tableName: 'users', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' })
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {

  @PrimaryKey @AutoIncrement @Column({ type: DataType.INTEGER, field: 'userId' })
  declare userId: CreationOptional<number>;

  @AllowNull(false) @Column({ type: DataType.STRING(100) })
  declare name: string;

  @AllowNull(false) @Unique @Column({ type: DataType.STRING(200) })
  declare email: string;

  @AllowNull(false) @Column({ type: DataType.STRING(255) })
  declare password: string;

  @AllowNull(true) @Column({ type: DataType.STRING(50) })
  declare mobile: CreationOptional<string | null>;

  @AllowNull(true) @Column(DataType.TEXT)
  declare refreshToken: CreationOptional<string | null>;

  @CreatedAt @Column(DataType.DATE)
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt @Column(DataType.DATE)
  declare updatedAt: CreationOptional<Date>;
}
