import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  tableName: 'batch_requests',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class BatchRequest extends Model<InferAttributes<BatchRequest>, InferCreationAttributes<BatchRequest>> {

  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER, field: 'id' })
  declare id: CreationOptional<number>;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: 'requestname' })
  declare requestname: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: 'csv_path' })
  declare csv_path: string;

  @AllowNull(false)
  @Default('pending')
  @Column({ type: DataType.STRING(50), field: 'status' })
  declare status: CreationOptional<string>;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'createdAt' })
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updatedAt' })
  declare updatedAt: CreationOptional<Date>;
}
