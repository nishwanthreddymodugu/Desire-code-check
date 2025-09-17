// The data shape for an incoming request to create a new campaign
export interface CampaignIn {
    campaignname: string;
    description?: string | null;
    fromdate: string;
    todate: string;
    verticalId: number;
    templateId: number;
    assets: number[]; // An array of master asset IDs
}

// The data shape for the final API response after creating a campaign
export interface CampaignCreateOut {
    campaignId: number;
    campaignname: string;
    description: string | null;
    fromdate: Date;
    todate: Date;
    verticalId: number;
    templateId: number;
    assets: number[]; // Returns an array of the master asset IDs used
}

// The data shape for the final API response when listing campaigns
export interface CampaignListOut {
    campaignId: number;
    campaignname: string;
    fromdate: Date;
    todate: Date;
    status: string | null;
    verticalId: number;
    templateId: number;
}

// The data shape for the final API response when getting a single campaign
export interface CampaignGetOut {
    campaignId: number;
    campaignname: string;
    description: string | null;
    status: string | null;
    fromdate: Date;
    todate: Date;
    verticalId: number;
    templateId: number;
    assets: number[]; // Returns an array of the master asset IDs used
}
