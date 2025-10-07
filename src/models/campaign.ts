import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, ForeignKey, BelongsTo, BelongsToMany, HasMany, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { Template } from "./template";
import { Vertical } from "./vertical";
import { Asset } from "./asset";
import { CampaignAsset } from "./campaignasset";
import { User } from "./user";
@Index(['status', 'fromDate', 'toDate'])
@Table({ tableName: "campaigns", timestamps: true, createdAt: "createdAt", updatedAt: "updatedAt" })
export class Campaign extends Model<InferAttributes<Campaign>, InferCreationAttributes<Campaign>> {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare campaignId: CreationOptional<number>;

  @AllowNull(false)
  @Column(DataType.STRING(150))
  @Column({ type: DataType.STRING(150), unique: true })
  declare campaignName: string;

  @Column(DataType.TEXT)
  declare description: CreationOptional<string | null>;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare fromDate: Date;
  
  @AllowNull(false)
  @Column(DataType.DATE)
  declare toDate: Date;
  
  @Index
  @Column(DataType.STRING(50))
  declare status: CreationOptional<string | null>;
  
  @Index
  @ForeignKey(() => Vertical)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare verticalId: number;

  @BelongsTo(() => Vertical, "verticalId")
  declare vertical: CreationOptional<Vertical>;
  
  @Index
  @ForeignKey(() => Template)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare templateId: number;
  
  @BelongsTo(() => Template, "templateId")
  declare template: CreationOptional<Template>;

  @BelongsToMany(() => Asset, {
    through: () => CampaignAsset,
    foreignKey: 'campaignId',
    otherKey: 'assetId'
  })
  declare assets: CreationOptional<Asset[]>;
  
  @HasMany(() => CampaignAsset, 'campaignId')
  declare campaignAssets: CreationOptional<CampaignAsset[]>;
  // -------------------------
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, field: 'createdBy' })
  declare createdBy: CreationOptional<number | null>;

  @BelongsTo(() => User, "createdBy")
  declare creator: CreationOptional<User>;


  @Column(DataType.STRING(100))
  declare updatedBy: CreationOptional<string | null>;

  @Column(DataType.BOOLEAN)
  declare deleted: CreationOptional<boolean>;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: CreationOptional<Date>;
  
  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: CreationOptional<Date>;
}