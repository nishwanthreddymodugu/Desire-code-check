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
import { Template } from './template';
import { Vertical } from './vertical';
import { Campaign } from './campaign';

@Table({
  tableName: 'image_gen_requests',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class ImageGenRequest extends Model<InferAttributes<ImageGenRequest>, InferCreationAttributes<ImageGenRequest>> {
  
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT, field: 'id' })
  declare id: CreationOptional<number>;

  @AllowNull(false)
  @Column({ type: DataType.TEXT, field: 'prompt' })
  declare prompt: string;

  @ForeignKey(() => Campaign)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'campaignId' })
  declare campaignId: number;

  @ForeignKey(() => Vertical)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'verticalId' })
  declare verticalId: number;

  @ForeignKey(() => Template)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'templateId' })
  declare templateId: number;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, field: 'figmaProjectId' })
  declare figmaProjectId: CreationOptional<number | null>;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'use_ref_img' })
  declare use_ref_img: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'use_template_prompt' })
  declare use_template_prompt: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'use_user_given_imgs' })
  declare use_user_given_imgs: boolean;

  @AllowNull(true)
  @Column({ type: DataType.TEXT, field: 'user_given_imgs' })
  declare user_given_imgs: CreationOptional<string | null>;

  @AllowNull(false)
  @Default('requested')
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
  @BelongsTo(() => Campaign, 'campaignId')
  declare campaign: CreationOptional<Campaign>;

  @BelongsTo(() => Vertical, 'verticalId')
  declare vertical: CreationOptional<Vertical>;

  @BelongsTo(() => Template, 'templateId')
  declare template: CreationOptional<Template>;
}
