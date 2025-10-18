import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { Campaign } from './campaign';
import { Asset } from './asset';

@Table({ tableName: 'campaignassets', timestamps: true, createdAt: "createdAt", updatedAt: "updatedAt" })
export class CampaignAsset extends Model<InferAttributes<CampaignAsset>, InferCreationAttributes<CampaignAsset>> {
    
    @ForeignKey(() => Campaign)
    @Column({ type: DataType.INTEGER, primaryKey: true, field: 'campaignId' })
    declare campaignId: number;

    @ForeignKey(() => Asset)
    @Column({ type: DataType.INTEGER, primaryKey: true, field: 'assetId' })
    declare assetId: number;
    
    @Column({ type: DataType.STRING(100), field: 'assetname' })
    declare assetName: string;
    
    @Column({ type: DataType.STRING(100), field: 'clonedFigmaId' })
    declare clonedFigmaId: CreationOptional<string | null>;

    @Column({ type: DataType.INTEGER, field: 'prod_image_width' })
    declare prod_image_width: CreationOptional<number>;

    @Column({ type: DataType.INTEGER, field: 'prod_image_height' })
    declare prod_image_height: CreationOptional<number>;

    @Column({ type: DataType.STRING(100), field: 'createdBy' })
    declare createdBy: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(100), field: 'updatedBy' })
    declare updatedBy: CreationOptional<string | null>;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'deleted' })
    declare deleted: CreationOptional<boolean>;

    @CreatedAt
    @Column(DataType.DATE)
    declare createdAt: CreationOptional<Date>;
  
    @UpdatedAt
    @Column(DataType.DATE)
    declare updatedAt: CreationOptional<Date>;
    
    @BelongsTo(() => Campaign, { foreignKey: 'campaignId' })
    declare campaign: CreationOptional<Campaign>;

    @BelongsTo(() => Asset, { foreignKey: 'assetId' })
    declare originalAsset: CreationOptional<Asset>;
}