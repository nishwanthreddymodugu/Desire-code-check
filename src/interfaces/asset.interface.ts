export interface AssetIn {
    assetId?: number; // Optional, only used for updates
    assetname: string;
    description?: string | null;
    figmaURL?: string | null;
    figmaId?: string | null;
    templateId: number;
    verticalId: number;
}

export interface AssetOut {
    assetId: number;
    assetname: string;
    description: string | null;
    figmaURL: string | null;
    figmaId: string | null;
    templateId: number;
    verticalId: number;
}
