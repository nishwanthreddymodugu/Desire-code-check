// import ImageGenRequestDAO from '../daos/imageGenRequest.dao';
// import sqsService from './sqs.service';
// import createLogger from '../config/logger';

// const logger = createLogger(module);
// const QUEUE_NAME = 'desire-image-request-queue';

// type GenerateInput = {
//   prompt: string;
//   campaignId: number;
//   verticalId: number;
//   templateId: number;
//   use_ref_img: boolean;
//   use_template_prompt: boolean;
//   use_user_given_imgs: boolean;
//   user_given_imgs?: string | null;
// };

// class ImageGenRequestService {
//   private parseUserGivenImagesCSV(csv?: string | null): string[] | null {
//     if (!csv) return null;
//     const arr = csv.split(',').map((s) => s.trim()).filter(Boolean);
//     return arr.length ? arr : null;
//   }

//   private async fetchReferenceImageUrlsIfNeeded(input: GenerateInput): Promise<string[]> {
//     if (!input.use_ref_img) return [];
//     return [];
//   }

//   private async uploadUserImagesIfNeeded(input: GenerateInput): Promise<string[] | null> {
//     const urls = this.parseUserGivenImagesCSV(input.user_given_imgs);
//     if (!input.use_user_given_imgs || !urls) return null;
//     return urls;
//   }

//   async generateRequest(input: GenerateInput) {
//     try {
//       await this.fetchReferenceImageUrlsIfNeeded(input);
//       await this.uploadUserImagesIfNeeded(input);
//     } catch (err: any) {
//       logger.warn(`S3 pre-processing skipped: ${err?.message}`);
//     }

//     const created = await ImageGenRequestDAO.create({
//       prompt: input.prompt,
//       verticalId: input.verticalId,
//       templateId: input.templateId,
//       use_ref_img: input.use_ref_img,
//       use_template_prompt: input.use_template_prompt,
//       use_user_given_imgs: input.use_user_given_imgs,
//       user_given_imgs: input.user_given_imgs
//     });

//     await sqsService.enqueueMessage(QUEUE_NAME, {
//       operation: 'generate_image',
//       request_id: created.id
//     });

//     return {
//       message: `Request ${created.id} accepted`,
//       requestId: created.id
//     };
//   }
// }

// export default new ImageGenRequestService();
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
        request_id: created.id
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
}

export default new ImageGenRequestService();
