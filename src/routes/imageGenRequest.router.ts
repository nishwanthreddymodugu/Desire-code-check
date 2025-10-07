import { Router, Request, Response } from 'express';
import imageGenService from '../services/imageGenRequest.service';

const router = Router();

// [POST] /api/v1/campaign/image/generate
router.post('/image/generate', async (req, res) => {
  const { campaignId, prompt, verticalId, templateId, use_ref_img, use_template_prompt, use_user_given_imgs, user_given_imgs } = req.body ?? {};
  const errors: string[] = [];

  const parseIntStrict = (v: any, name: string): number | undefined => {
    const n = Number(v);
    if (!Number.isInteger(n)) { errors.push(`${name} must be an integer`); return undefined; }
    return n;
  };
  const parseBoolStrict = (v: any, name: string): boolean | undefined => {
    if (typeof v !== 'boolean') { errors.push(`${name} must be a boolean (true/false)`); return undefined; }
    return v;
  };

  const campaignIdNum = parseIntStrict(campaignId, 'campaignId');
  const verticalIdNum = parseIntStrict(verticalId, 'verticalId');
  const templateIdNum = parseIntStrict(templateId, 'templateId');
  const useRefImgBool = parseBoolStrict(use_ref_img, 'use_ref_img');
  const useTemplatePromptBool = parseBoolStrict(use_template_prompt, 'use_template_prompt');
  const useUserGivenImgsBool = parseBoolStrict(use_user_given_imgs, 'use_user_given_imgs');

  if (errors.length) return res.status(400).json({ errors });

  const payload = {
    campaignId: campaignIdNum as number,
    prompt: String(prompt),
    verticalId: verticalIdNum as number,
    templateId: templateIdNum as number,
    use_ref_img: useRefImgBool as boolean,
    use_template_prompt: useTemplatePromptBool as boolean,
    use_user_given_imgs: useUserGivenImgsBool as boolean,
    user_given_imgs: typeof user_given_imgs === 'string' ? user_given_imgs : undefined
  };
  const result = await imageGenService.generateRequest(payload);
  return res.status(202).json(result);
});

router.get('/:campaignId/image/requests/list', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.query as { status?: string };

    const errors: string[] = [];

    const campaignIdNum = Number(campaignId);
    if (!Number.isInteger(campaignIdNum)) errors.push('campaignId must be an integer');

    const allowed = new Set(['requested', 'pending', 'completed', 'cancelled']);
    let statusFilter: 'requested' | 'pending' | 'completed' | 'cancelled' | undefined = undefined;
    if (typeof status === 'string') {
      if (!allowed.has(status)) {
        errors.push('status must be one of requested|pending|completed|cancelled');
      } else {
        statusFilter = status as any;
      }
    }

    if (errors.length) return res.status(400).json({ errors });

    const rows = await imageGenService.listRequests({
      campaignId: campaignIdNum,
      status: statusFilter
    });

    // Only id, prompt, status
    const resp = rows.map((r: { id: number; prompt: string; status: string }) => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status
    }));

    return res.json(resp);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to list requests' });
  }
});

// [GET] /api/v1/campaign/:campaignId/image/requests/:requestId/get
router.get('/:campaignId/image/requests/:requestId/get', async (req: Request, res: Response) => {
  try {
    const { campaignId, requestId } = req.params;

    const errors: string[] = [];
    const campaignIdNum = Number(campaignId);
    const requestIdNum = Number(requestId);

    if (!Number.isInteger(campaignIdNum)) errors.push('campaignId must be an integer');
    if (!Number.isInteger(requestIdNum)) errors.push('requestId must be an integer');

    if (errors.length) return res.status(400).json({ errors });

    const row = await imageGenService.getRequest({
      campaignId: campaignIdNum,
      requestId: requestIdNum
    });

    if (!row) return res.status(404).json({ error: 'Request not found' });

    // Response shape per contract
    return res.json({
      id: row.id,
      prompt: row.prompt,
      verticalId: row.verticalId,
      templateId: row.templateId,
      projectId: row.figmaProjectId ?? null,
      use_ref_img: row.use_ref_img,
      use_template_prompt: row.use_template_prompt,
      use_user_given_imgs: row.use_user_given_imgs,
      user_given_imgs: row.user_given_imgs ?? ''
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to retrieve request' });
  }
});


export default router;
