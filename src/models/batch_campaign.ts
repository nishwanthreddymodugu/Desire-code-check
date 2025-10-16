import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { BatchRequest } from './batchrequest'; 

@Table({
  tableName: 'batch_campaigns',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class BatchCampaign extends Model<InferAttributes<BatchCampaign>, InferCreationAttributes<BatchCampaign>> {

  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER, field: 'id' })
  declare id: CreationOptional<number>;

  @ForeignKey(() => BatchRequest)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'requestId' })
  declare requestId: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: 'campaignName' })
  declare campaignName: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500), field: 'data_path' })
  declare data_path: CreationOptional<string | null>; // S3 path

  @AllowNull(false)
  @Default('pending')
  @Column({ type: DataType.STRING(50), field: 'status' })
  declare status: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100), field: 'createdBy' })
  declare createdBy: CreationOptional<string | null>;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100), field: 'updatedBy' })
  declare updatedBy: CreationOptional<string | null>;

  @Default(false)
  @AllowNull(false)
  @Column({ type: DataType.BOOLEAN, field: 'deleted' })
  declare deleted: CreationOptional<boolean>;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'createdAt' })
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updatedAt' })
  declare updatedAt: CreationOptional<Date>;

  // Associations
  @BelongsTo(() => BatchRequest, 'requestId')
  declare batchRequest: CreationOptional<BatchRequest>;
}
