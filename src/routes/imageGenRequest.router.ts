// src/routes/imageGenRequest.router.ts
import { Router, Request, Response } from 'express';
import imageGenService from '../services/imageGenRequest.service';

const router = Router();

// Helper to send uniform error responses from inside routes
function sendError(res: Response, status: number, message: string, details?: any) {
  return res.status(status).json({
    status,
    error: status >= 500 ? 'Internal Server Error' : 'Request Error',
    message,
    details
  });
}

// [POST] /api/v1/campaign/image/generate
router.post('/image/generate', async (req: Request, res: Response) => {
  try {
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

    if (typeof prompt !== 'string' || !prompt?.trim()) errors.push('prompt is required and must be a non-empty string');

    if (errors.length) return sendError(res, 400, 'Validation failed', errors);

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
  } catch (e: any) {
    return sendError(res, 500, e?.message || 'Failed to generate request');
  }
});

// [GET] /api/v1/campaign/:campaignId/image/requests/list
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

    if (errors.length) return sendError(res, 400, 'Validation failed', errors);

    const rows = await imageGenService.listRequests({ campaignId: campaignIdNum, status: statusFilter });
    const resp = rows.map((r: { id: number; prompt: string; status: string }) => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status
    }));

    return res.status(200).json(resp);
  } catch (e: any) {
    return sendError(res, 500, e?.message || 'Failed to list requests');
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

    if (errors.length) return sendError(res, 400, 'Validation failed', errors);

    const row = await imageGenService.getRequest({ campaignId: campaignIdNum, requestId: requestIdNum });
    if (!row) return sendError(res, 404, `Request ${requestIdNum} not found in campaign ${campaignIdNum}`);

    return res.status(200).json({
      id: row.id,
      prompt: row.prompt,
      campaignId: row.campaignId,
      verticalId: row.verticalId,
      templateId: row.templateId,
      // projectId: row.figmaProjectId ?? null,
      use_ref_img: row.use_ref_img,
      use_template_prompt: row.use_template_prompt,
      use_user_given_imgs: row.use_user_given_imgs,
      user_given_imgs: row.user_given_imgs ?? '',
      status: row.status
    });
  } catch (e: any) {
    return sendError(res, 500, e?.message || 'Failed to retrieve request');
  }
});

// [PUT] /api/v1/campaign/:campaignId/image/requests/:requestId/update-status
router.put('/:campaignId/image/requests/:requestId/update-status', async (req: Request, res: Response) => {
  try {
    const { campaignId, requestId } = req.params;
    const { new_status } = req.body ?? {};

    const errors: string[] = [];
    const campaignIdNum = Number(campaignId);
    const requestIdNum = Number(requestId);
    if (!Number.isInteger(campaignIdNum)) errors.push('campaignId must be an integer');
    if (!Number.isInteger(requestIdNum)) errors.push('requestId must be an integer');

    const allowedValues = new Set(['requested', 'pending', 'completed', 'cancelled']);
    if (typeof new_status !== 'string' || !allowedValues.has(new_status)) {
      errors.push('new_status must be one of requested|pending|completed|cancelled');
    }

    if (errors.length) return sendError(res, 400, 'Validation failed', errors);

    const result = await imageGenService.updateRequestStatus({
      campaignId: campaignIdNum,
      requestId: requestIdNum,
      newStatus: new_status as 'requested' | 'pending' | 'completed' | 'cancelled'
    });

    if (!result || (result.updated === false && result.reason === 'not_found')) {
      return sendError(res, 404, `Request ${requestIdNum} not found in campaign ${campaignIdNum}`);
    }

    if (result.updated === false && result.reason === 'invalid_transition') {
      return sendError(res, 422, `Transition not allowed from '${result.current_status}' to '${result.attempted_status}'`);
    }

    // Silent success (no body)
    return res.status(204).end();
  } catch (e: any) {
    return sendError(res, 500, e?.message || 'Failed to update status');
  }
});

//   router.get('/:campaignId/image/requests/:requestId/status', async (req: Request, res: Response) => {
//     try {
//         const { campaignId, requestId } = req.params;

//         const campaignIdNum = Number(campaignId);
//         const requestIdNum = Number(requestId);
//         if (isNaN(campaignIdNum) || isNaN(requestIdNum)) {
//             return res.status(400).json({ message: 'campaignId and requestId must be valid numbers.' });
//         }

//         const result = await imageGenService.getRequestStatus(requestIdNum, campaignIdNum);
//         return res.status(200).json(result);

//     } catch (error: any) {
//         // The catch block will handle the "Not Found" error from the service.
//         const status = error.status || 500;
//         return res.status(status).json({ message: error.message || 'Failed to retrieve request status.' });
//     }
// });
export default router;
