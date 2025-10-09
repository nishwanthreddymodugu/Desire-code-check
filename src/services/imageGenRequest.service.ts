import ImageGenRequestDAO from '../daos/imageGenRequest.dao';
import sqsService from './sqs.service';
import createLogger from '../config/logger';

const logger = createLogger(module);
const QUEUE_NAME = 'desire-image-request-queue';

type GenerateInput = {
  prompt: string;
  campaignId: number;
  verticalId: number;
  templateId: number;
  use_ref_img: boolean;
  use_template_prompt: boolean;
  use_user_given_imgs: boolean;
  user_given_imgs?: string | null;
};

type ListInput = {
  campaignId: number;
  status?: 'requested' | 'pending' | 'completed' | 'cancelled';
};

type GetInput = {
  campaignId: number;
  requestId: number;
};

type UpdateStatusInput = {
  campaignId: number;
  requestId: number;
  newStatus: 'requested' | 'pending' | 'completed' | 'cancelled';
};

const ALLOWED_TRANSITIONS: Record<'requested' | 'pending' | 'completed' | 'cancelled', ReadonlySet<string>> = {
  requested: new Set(['pending']),                  // optional internal step
  pending: new Set(['completed', 'cancelled']),     // API-allowed transitions
  completed: new Set([]),                           // terminal
  cancelled: new Set([])                            // terminal
};

class ImageGenRequestService {
  async generateRequest(input: GenerateInput) {
    const created = await ImageGenRequestDAO.create({
      prompt: input.prompt,
      campaignId: input.campaignId,
      verticalId: input.verticalId,
      templateId: input.templateId,
      use_ref_img: input.use_ref_img,
      use_template_prompt: input.use_template_prompt,
      use_user_given_imgs: input.use_user_given_imgs,
      user_given_imgs: input.user_given_imgs
    });

    try {
      await sqsService.enqueueMessage(QUEUE_NAME, {
        operation: 'generate_image',
        request_id: created.id,
        campaign_id: input.campaignId // localstack requires this to match the queue
      });

      await ImageGenRequestDAO.updateStatus(created.id, 'pending');

      return {
        message: `Request ${created.id} accepted`,
        requestId: created.id
      };
    } catch (err: any) {
      logger.error(`Failed to enqueue SQS for request ${created.id}: ${err?.message}`);
      throw new Error('Failed to enqueue request');
    }
  }

  async listRequests(input: ListInput) {
    return ImageGenRequestDAO.listByCampaign({
      campaignId: input.campaignId,
      status: input.status
    });
  }

  async getRequest(input: GetInput) {
    return ImageGenRequestDAO.findByIdInCampaign({
      campaignId: input.campaignId,
      id: input.requestId
    });
  }

  async updateRequestStatus(input: UpdateStatusInput) {
    const row = await ImageGenRequestDAO.findByIdInCampaign({
      campaignId: input.campaignId,
      id: input.requestId
    });

    if (!row) {
      return { updated: false, reason: 'not_found' as const };
    }

    const current = (row.status as 'requested' | 'pending' | 'completed' | 'cancelled') ?? 'requested';
    const next = input.newStatus;

    const canTransition = ALLOWED_TRANSITIONS[current]?.has(next) === true;
    if (!canTransition) {
      return {
        updated: false,
        reason: 'invalid_transition' as const,
        current_status: current,
        attempted_status: next
      };
    }

    await ImageGenRequestDAO.updateStatus(input.requestId, next);

    return {
      updated: true,
      requestId: input.requestId,
      from: current,
      to: next
    };
  }
}

export default new ImageGenRequestService();
