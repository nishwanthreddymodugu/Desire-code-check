// import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
// import Vertical from './vertical';
// import Asset from './asset';
// import Campaign from './campaign';

// // Mapped to 'templates' table
// @Table({ tableName: 'templates', timestamps: true })
// export default class Template extends Model {
//     // Mapped to 'templateId' column
//     @Column({
//         type: DataType.UUID,
//         defaultValue: DataType.UUIDV4,
//         primaryKey: true,
//         field: 'templateId'
//     })
//     id!: string;

//     @ForeignKey(() => Vertical)
//     @Column({ type: DataType.UUID, allowNull: false, field: 'verticalId' })
//     verticalId!: string;

//     // Mapped to 'templateName' column
//     @Column({
//         type: DataType.STRING(100),
//         allowNull: false,
//         field: 'templateName'
//     })
//     name!: string;

//     // Added 'stylePrompt' property
//     @Column({ type: DataType.TEXT, field: 'stylePrompt' })
//     stylePrompt!: string;

//     // --- Audit & Timestamp Columns ---
//     @Column({ type: DataType.STRING(100), field: 'createdBy' })
//     createdBy!: string;

//     @Column({ type: DataType.STRING(100), field: 'updatedBy' })
//     updatedBy!: string;

//     @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'deleted' })
//     deleted!: boolean;

//     @CreatedAt
//     @Column({ field: 'createdAt' })
//     createdAt!: Date;

//     @UpdatedAt
//     @Column({ field: 'updatedAt' })
//     updatedAt!: Date;

//     @BelongsTo(() => Vertical)
//     vertical!: Vertical;

//     @HasMany(() => Asset)
//     assets!: Asset[];

//     @HasMany(() => Campaign)
//     campaigns!: Campaign[];
// }

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