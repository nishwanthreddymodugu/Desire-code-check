import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import  {Vertical}  from "./vertical";
import  {Asset } from "./asset";
import { Campaign}  from "./campaign";

@Table({ tableName: "templates", timestamps: true, createdAt: "createdAt", updatedAt: "updatedAt" })
export class Template extends Model<InferAttributes<Template>, InferCreationAttributes<Template>> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER) declare templateId: CreationOptional<number>;
  @AllowNull(false) @Column(DataType.STRING(100)) declare templateName: string;
  @ForeignKey(() => Vertical) @AllowNull(false) @Column(DataType.INTEGER) declare verticalId: number;
  @BelongsTo(() => Vertical, "verticalId") declare vertical?: Vertical;
  @Column(DataType.TEXT) declare stylePrompt: CreationOptional<string | null>;
  @Column(DataType.STRING(100)) declare createdBy: CreationOptional<string | null>;
  @Column(DataType.STRING(100)) declare updatedBy: CreationOptional<string | null>;
  @Column(DataType.BOOLEAN) declare deleted: CreationOptional<boolean>;
  @HasMany(() => Asset, { foreignKey: "templateId", as: "assets" }) declare assets?: Asset[];
  @HasMany(() => Campaign, { foreignKey: "templateId", as: "campaigns" }) declare campaigns?: Campaign[];
}