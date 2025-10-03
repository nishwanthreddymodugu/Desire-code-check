import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, ForeignKey, BelongsTo, BelongsToMany, CreatedAt, UpdatedAt } from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { Template } from "./template";
import { Vertical } from "./vertical";
import { Campaign } from "./campaign";
import { CampaignAsset } from "./campaignasset";

@Table({ tableName: "assets", timestamps: true, createdAt: "createdAt", updatedAt: "updatedAt" })
export class Asset extends Model<InferAttributes<Asset>, InferCreationAttributes<Asset>> {

  @PrimaryKey @AutoIncrement @Column({ type: DataType.INTEGER, field: 'assetId' })
  declare assetId: CreationOptional<number>;

  @AllowNull(false) @Column({ type: DataType.STRING(100), field: 'assetname' })
  declare assetName: string;
 

  @Column(DataType.TEXT)
  declare description: CreationOptional<string | null>;
  @Column({ type: DataType.STRING(255), field: 'figmaURL' })
  declare figmaURL: CreationOptional<string | null>;
  @Column(DataType.STRING(100))
  declare figmaId: CreationOptional<string | null>;
  @ForeignKey(() => Template) @AllowNull(false) @Column(DataType.INTEGER)
  declare templateId: number;
  @ForeignKey(() => Vertical) @AllowNull(false) @Column(DataType.INTEGER)
  declare verticalId: number;
  @Column({ type: DataType.STRING(100), field: 'stylePrompt' })
  declare stylePrompt: CreationOptional<string | null>;
  @Column({ type: DataType.STRING(100), field: 'createdBy' })
  declare createdBy: CreationOptional<string | null>;
  @Column({ type: DataType.STRING(100), field: 'updatedBy' })
  declare updatedBy: CreationOptional<string | null>;
  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'deleted' })
  declare deleted: CreationOptional<boolean>;
  @CreatedAt @Column(DataType.DATE)
  declare createdAt: CreationOptional<Date>;
  @UpdatedAt @Column(DataType.DATE)
  declare updatedAt: CreationOptional<Date>;
      // New Columns for image dimensions
  @Column({ type: DataType.INTEGER, field: 'prod_image_width', defaultValue: 200 })
  declare prod_image_width: CreationOptional<number>;
  @Column({ type: DataType.INTEGER, field: 'prod_image_height', defaultValue: 200 })
  declare prod_image_height: CreationOptional<number>;

  @BelongsTo(() => Template, "templateId")
  declare template: CreationOptional<Template>;
  @BelongsTo(() => Vertical, "verticalId")
  declare vertical: CreationOptional<Vertical>;
  @BelongsToMany(() => Campaign, { through: () => CampaignAsset, foreignKey: 'assetId', otherKey: 'campaignId' })
  declare campaigns: CreationOptional<Campaign[]>;
}
