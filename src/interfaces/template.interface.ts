// The data shape for an incoming request to create/update a template
export interface TemplateIn {
    templateId?: number; // Optional, only used for updates
    templatename: string;
    verticalId: number;
}

// The data shape for the final API response
export interface TemplateOut {
    templateId: number;
    templatename: string;
    verticalId: number;
}

// The data shape for the final API response when getting a single template
export interface TemplateGetOut {
    templateId: number;
    templatename: string;
    verticalId: number;
    stylePrompt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}