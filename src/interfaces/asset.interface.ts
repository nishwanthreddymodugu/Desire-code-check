export interface AssetIn {
    assetId?: number; // Optional, only used for updates
    assetname: string;
    description?: string | null;
    figmaURL?: string | null;
    figmaId?: string | null;
    templateId: number;
    verticalId: number;
    prod_image_width?: number;
    prod_image_height?: number;
}

export interface AssetOut {
    assetId: number;
    assetname: string;
    description: string | null;
    figmaURL: string | null;
    figmaId: string | null;
    templateId: number;
    verticalId: number;
    prod_image_width: number;
    prod_image_height: number;
}
