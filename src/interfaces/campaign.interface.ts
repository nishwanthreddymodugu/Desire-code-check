export interface CampaignIn {
    campaignname: string;
    description?: string | null;
    fromdate: string;
    todate: string;
    verticalId: number;
    templateId: number;
    assets: number[];
    createdBy: {
        createdByUserID: number;
        createdByName: string;
    };
}
export interface CampaignCreateOut {
    campaignId: number;
    campaignname: string;
    description: string | null;
    fromdate: Date;
    todate: Date;
    verticalId: number;
    templateId: number;
    assets: number[]; // A simple array of the master asset IDs
    createdByUserID: number; // The numeric ID of the user who created it
    createdAt: string;
}
export interface CampaignListOut {
    campaignId: number;
    campaignname: string;
    fromdate: Date;
    todate: Date;
    status: string | null;
    verticalId: number;
    templateId: number;
    createdBy: number | null;
    createdAt: string;
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
    createdByUserID: number | null; // Corrected property name
    createdAt: string;
    // --- NEW ENRICHED FIELDS ---
   // verticalName: string;
    //templateName: string;
}
