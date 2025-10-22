import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, CreatedAt, UpdatedAt, Unique, IsEmail, Is } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({ tableName: 'users', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' })
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {

  @PrimaryKey @AutoIncrement @Column({ type: DataType.INTEGER, field: 'userId' })
  declare userId: CreationOptional<number>;

  @AllowNull(false) @Column({ type: DataType.STRING(100) })
  declare name: string;
  
  @AllowNull(false) @Unique @IsEmail @Column(DataType.STRING(200))
  declare email: string;

  @AllowNull(false) @Column({ type: DataType.STRING(255) })
  declare hash: string;

  @AllowNull(true)
  @Unique
  @Is('IndianMobile', (value) => {
    if (value && !/^\d{10}$/.test(value)) {
      throw new Error('Validation failed: mobile number must be exactly 10 digits');
    }
  })
  @Column({ type: DataType.STRING(50), field: 'mobile' })
  declare mobile: CreationOptional<string | null>;
  
  @AllowNull(true) @Column(DataType.TEXT)
  declare refreshToken: CreationOptional<string | null>;

  @CreatedAt @Column(DataType.DATE)
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt @Column(DataType.DATE)
  declare updatedAt: CreationOptional<Date>;
}
