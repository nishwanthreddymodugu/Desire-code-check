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
        // 'figmaProjectId', 
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
      // figmaProjectId: (plain.figmaProjectId ?? null) as number | null,
      use_ref_img: plain.use_ref_img as boolean,
      use_template_prompt: plain.use_template_prompt as boolean,
      use_user_given_imgs: plain.use_user_given_imgs as boolean,
      user_given_imgs: (plain.user_given_imgs ?? '') as string,
      status: plain.status as string
    };
  }
  /** 
     * @returns An object with the id and status, or null if not found.
     */
  public async findStatusById(requestId: number, campaignId: number): Promise<{ id: number, status: string } | null> {
    const request = await ImageGenRequest.findOne({
        where: {
            id: requestId,
            campaignId: campaignId
        },
        attributes: ['id', 'status'] 
    });
    return request ? request.get({ plain: true }) : null;
}

}


export default new ImageGenRequestDAO();
