// import { CreationAttributes } from 'sequelize';
// import { ImageGenRequest } from '../models/image_gen'; // adjust to your model file
// import createLogger from '../config/logger';
// const logger = createLogger(module);

// class ImageGenDAO {
//   async create(data: CreationAttributes<ImageGenRequest>) {
//     try {
//       return await ImageGenRequest.create(data);
//     } catch (e) {
//       logger.error(`Create image_gen_request failed: ${(e as Error).message}`);
//       throw e;
//     }
//   }

//   async list(campaignId: number, status?: string) {
//     try {
//       const where: any = { campaignId };
//       if (status) where.status = status;
//       return await ImageGenRequest.findAll({ where, attributes: ['id', 'prompt', 'status'] });
//     } catch (e) {
//       logger.error(`List image_gen_requests failed: ${(e as Error).message}`);
//       throw e;
//     }
//   }

//   async findById(id: number, campaignId: number) {
//     try {
//       return await ImageGenRequest.findOne({
//         where: { id, campaignId },
//         attributes: [
//           'id',
//           'prompt',
//           'verticalId',
//           'templateId',
//           ['figmaProjectId', 'projectId'],
//           'use_ref_img',
//           'use_template_prompt',
//           'use_user_given_imgs',
//           'user_given_imgs',
//           'status',
//         ],
//       });
//     } catch (e) {
//       logger.error(`Find image_gen_request ${id} failed: ${(e as Error).message}`);
//       throw e;
//     }
//   }

//   async getStatus(id: number, campaignId: number) {
//     try {
//       const row = await ImageGenRequest.findOne({ where: { id, campaignId }, attributes: ['status'] });
//       return row?.status ?? null;
//     } catch (e) {
//       logger.error(`Get status for ${id} failed: ${(e as Error).message}`);
//       throw e;
//     }
//   }

//   async updateStatus(id: number, campaignId: number, newStatus: string) {
//     try {
//       await ImageGenRequest.update({ status: newStatus }, { where: { id, campaignId } });
//     } catch (e) {
//       logger.error(`Update status for ${id} failed: ${(e as Error).message}`);
//       throw e;
//     }
//   }
// }

// export default new ImageGenDAO();
import { ImageGenRequest } from '../models/image_gen';

export type CreateImageGenRequestInput = {
  prompt: string;
  campaignId: number;
  verticalId: number;
  templateId: number;
  use_ref_img: boolean;
  use_template_prompt: boolean;
  use_user_given_imgs: boolean;
  user_given_imgs?: string | null;
};

export type ListByCampaignInput = {
  campaignId: number;
  status?: 'requested' | 'pending' | 'completed' | 'cancelled';
};

export type FindByIdInCampaignInput = {
  campaignId: number;
  id: number;
};

class ImageGenRequestDAO {
  async create(data: CreateImageGenRequestInput) {
    return ImageGenRequest.create({
      prompt: data.prompt,
      campaignId: data.campaignId,
      verticalId: data.verticalId,
      templateId: data.templateId,
      use_ref_img: data.use_ref_img,
      use_template_prompt: data.use_template_prompt,
      use_user_given_imgs: data.use_user_given_imgs,
      user_given_imgs: data.user_given_imgs ?? null
    } as any);
  }

  async updateStatus(id: number, status: 'requested' | 'pending' | 'completed' | 'cancelled') {
    await ImageGenRequest.update({ status }, { where: { id } });
  }

  async listByCampaign(input: ListByCampaignInput) {
    const where: any = { campaignId: input.campaignId, deleted: false };
    if (input.status) where.status = input.status;

    const rows = await ImageGenRequest.findAll({
      attributes: ['id', 'prompt', 'status'],
      where,
      order: [['id', 'DESC']]
    });

    return rows.map(
      (r): { id: number; prompt: string; status: string } =>
        r.get({ plain: true }) as { id: number; prompt: string; status: string }
    );
  }

  async findByIdInCampaign(input: FindByIdInCampaignInput) {
    const row = await ImageGenRequest.findOne({
      attributes: [
        'id',
        'prompt',
        'verticalId',
        'campaignId',
        'templateId',
        'figmaProjectId', 
        'use_ref_img',
        'use_template_prompt',
        'use_user_given_imgs',
        'user_given_imgs',
        'status'
      ],
      where: { id: input.id, campaignId: input.campaignId, deleted: false }
    });

    if (!row) return null;

    const plain = row.get({ plain: true }) as any;
    return {
      id: plain.id as number,
      prompt: plain.prompt as string,
      verticalId: plain.verticalId as number,
      campaignId: plain.campaignId as number,
      templateId: plain.templateId as number,
      figmaProjectId: (plain.figmaProjectId ?? null) as number | null,
      use_ref_img: plain.use_ref_img as boolean,
      use_template_prompt: plain.use_template_prompt as boolean,
      use_user_given_imgs: plain.use_user_given_imgs as boolean,
      user_given_imgs: (plain.user_given_imgs ?? '') as string,
      status: plain.status as string
    };
  }
}

export default new ImageGenRequestDAO();

