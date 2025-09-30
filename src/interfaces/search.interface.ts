export interface CampaignDocument {
    campaignId: number;
    campaignname: string;
    status: string | null;
    fromdate: string | Date;
    todate: string | Date;
    verticalId: number;
    templateId: number;
    assets: number[];
    createdBy?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    updatedBy?: string | null;
}