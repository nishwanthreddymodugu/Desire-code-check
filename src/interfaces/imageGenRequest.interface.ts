// Incoming body for creating an image generation request
export interface ImageGenRequestIn {
  prompt: string;
  campaignId: number;              // corrected key (not "campignId")
  verticalId: number;
  templateId: number;
  use_ref_img: boolean;
  use_template_prompt: boolean;
  use_user_given_imgs: boolean;
  user_given_imgs?: string | null; // comma-separated URLs (optional)
}

// API response after creating a request
export interface ImageGenCreateOut {
  message: string;   // e.g., "Request <id> accepted"
  requestId: number; // DB id for image_gen_requests
}

// One list item
export interface ImageGenListItemOut {
  id: number;
  prompt: string;
  status: 'requested' | 'pending' | 'completed' | 'cancelled';
}

// List response
export type ImageGenListOut = ImageGenListItemOut[];

export interface ImageGenGetOut {
  id: number;
  prompt: string;
  verticalId: number;
  templateId: number;
  // projectId: number | null; // maps from figmaProjectId
  use_ref_img: boolean;
  use_template_prompt: boolean;
  use_user_given_imgs: boolean;
  user_given_imgs: string;  // empty string if none
  status: 'requested' | 'pending' | 'completed' | 'cancelled';
}

// Incoming body for update-status (endpoint returns 204 No Content on success)
export interface ImageGenUpdateStatusIn {
  new_status: 'requested' | 'pending' | 'completed' | 'cancelled';
}

// No Out interface because the route intentionally returns 204 with no body.
