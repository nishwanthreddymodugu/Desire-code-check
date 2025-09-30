export interface CampaignIn {
    campaignname: string;
    description?: string | null;
    fromdate: string;
    todate: string;
    verticalId: number;
    templateId: number;
    assets: number[]; 
}

export interface CampaignCreateOut {
    campaignId: number;
    campaignname: string;
    description: string | null;
    fromdate: Date;
    todate: Date;
    verticalId: number;
    templateId: number;
    assets: number[]; 
}
export interface CampaignListOut {
    campaignId: number;
    campaignname: string;
    fromdate: Date;
    todate: Date;
    status: string | null;
    verticalId: number;
    templateId: number;
}

export interface CampaignGetOut {
    campaignId: number;
    campaignname: string;
    description: string | null;
    status: string | null;
    fromdate: Date;
    todate: Date;
    verticalId: number;
    templateId: number;
    assets: number[]; 
}
