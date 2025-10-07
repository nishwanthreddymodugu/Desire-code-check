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
    userId: number; // The ID of the user who created it
    createdByName: string; // The name of the user for searching
}