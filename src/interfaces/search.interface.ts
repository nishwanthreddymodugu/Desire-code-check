export interface CampaignDocument {
    campaignId: number;
    campaignname: string;
    description?: string | null;
    status: string | null;
    fromdate: string | Date;
    todate: string | Date;
    verticalId: number;
    templateId: number;
    assets: number[];
    verticalName: string;
    templateName: string;
    createdBy?: string | null;
    createdAt: string | Date;
}