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
    createdByuserId: number; 
    createdByName: string; 
}
export interface StatusAggregation { [status: string]: number; }
export interface MonthlyAggregation { [month: string]: number; }
export interface VerticalAggregation { [verticalName: string]: number; }


export interface SearchResult {

    total_campaigns: number;

    campaigns: CampaignDocument[];

    aggregations: {

        campaigns_by_status: StatusAggregation;

        campaigns_by_month: MonthlyAggregation;

        campaigns_by_vertical: VerticalAggregation;

        total_assets: number;

    };

}
export interface SearchQuery {

    q?: string;

    status?: string;

    createdBy?: string;

    createdAtFrom?: string;

    createdAtTo?: string;

    fromdate?: string;

    todate?: string;

    verticalId?: number;

    templateId?: number;

    month?: string;

}
export interface SearchResponse {

    total_campaigns: number;
    campaigns: CampaignDocument[];
  
    aggregations: {
        campaigns_by_status: StatusAggregation;
        campaigns_by_month: MonthlyAggregation;
        campaigns_by_vertical: VerticalAggregation;
        total_assets: number;
    };
}