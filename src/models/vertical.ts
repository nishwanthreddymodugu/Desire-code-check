import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, HasMany } from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import {Template } from "./template";
import { Asset } from "./asset";
import {Campaign} from "./campaign";

@Table({ tableName: "verticals", timestamps: true, createdAt: "createdAt", updatedAt: "updatedAt" })
export class Vertical extends Model<InferAttributes<Vertical>, InferCreationAttributes<Vertical>> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER) declare verticalId: CreationOptional<number>;
  @AllowNull(false) @Column(DataType.STRING(100)) declare verticalName: string;
  @Column(DataType.STRING(100)) declare createdBy: CreationOptional<string | null>;
  @Column(DataType.STRING(100)) declare updatedBy: CreationOptional<string | null>;
  @Column(DataType.BOOLEAN) declare deleted: CreationOptional<boolean>;
  @HasMany(() => Template, { foreignKey: "verticalId", as: "templates" }) declare templates?: Template[];
  @HasMany(() => Asset, { foreignKey: "verticalId", as: "assets" }) declare assets?: Asset[];
  @HasMany(() => Campaign, { foreignKey: "verticalId", as: "campaigns" }) declare campaigns?: Campaign[];
}