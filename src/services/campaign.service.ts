import { FindOptions, Op, CreationAttributes } from 'sequelize';
import { sequelize } from '../config/database';
import CampaignDAO from '../daos/campaign.dao';
import TemplateDAO from '../daos/template.dao';
import AssetDAO from '../daos/asset.dao';
import VerticalDAO from '../daos/vertical.dao'
import { Campaign } from '../models/campaign';
import { Template } from '../models/template';
import SearchService from './search.service'
import { CampaignDocument } from '../interfaces/search.interface';
import { CampaignIn, CampaignCreateOut, CampaignListOut, CampaignGetOut } from '../interfaces/campaign.interface';
import fs from 'fs/promises';
import s3Service from './s3.service';
import FigmaClient from '../clients/figma.client';
//import s3Service from '../services/s3.service';
import createLogger from '../config/logger';
import path from 'path';

const logger = createLogger(module);
class CampaignService {
  // List campaigns
  public create(campaignInput: CampaignIn): Promise<CampaignCreateOut> {
    return new Promise(async (resolve, reject) => {
      const transaction = await sequelize.transaction();
      try {
        logger.debug(`Service: Creating campaign '${campaignInput.campaignname}'`);

        // --- Step 1: Validation ---
        if (!campaignInput.campaignname || campaignInput.campaignname.trim() === '') {
          await transaction.rollback();
          return reject(new Error("Validation failed: campaignname is required and cannot be empty."));
        }
        const [template, originalAssets, vertical] = await Promise.all([
          TemplateDAO.findById(campaignInput.templateId),
          AssetDAO.list({ where: { assetId: campaignInput.assets } }),
          VerticalDAO.findById(campaignInput.verticalId)
        ]);
        if (!template) {
          await transaction.rollback();
          return reject(new Error(`Template with ID '${campaignInput.templateId}' does not exist.`));
        }
        if (!vertical) {
          await transaction.rollback();
          return reject(new Error(`Vertical with ID '${campaignInput.verticalId}' does not exist.`));
        }
        if (template.verticalId !== campaignInput.verticalId) {
          await transaction.rollback();
          return reject(new Error(`Template with ID '${campaignInput.templateId}' does not belong to Vertical '${campaignInput.verticalId}'.`));
        }
        if (originalAssets.length !== campaignInput.assets.length) {
          await transaction.rollback();
          return reject(new Error("One or more provided asset IDs do not exist."));
        }

        // Validate all assets have a figmaId
        for (const asset of originalAssets) {
          if (!asset.figmaId) {
            await transaction.rollback();
            return reject(new Error(`Asset '${asset.assetName}' (ID: ${asset.assetId}) is missing a figmaId.`));
          }
        }

        // --- Step 2: Main Logic ---
        const campaignData: CreationAttributes<Campaign> = {
          campaignName: campaignInput.campaignname,
          description: campaignInput.description,
          fromDate: new Date(campaignInput.fromdate),
          toDate: new Date(campaignInput.todate),
          templateId: template.templateId,
          verticalId: template.verticalId,
          status: 'draft',
          createdBy: campaignInput.createdByUserID,
        };
        const newCampaign = await CampaignDAO.createCampaign(campaignData, transaction);
        // const clonePromises = originalAssets.map(asset => figmaService.cloneFile(asset.figmaId!));
        // const clonedFigmaIds = await Promise.all(clonePromises);
        const clonePromises = originalAssets.map(asset => FigmaClient.cloneFile(asset.figmaId!));
        const clonedFigmaIds = await Promise.all(clonePromises);
        const campaignAssetsToCreate = originalAssets.map((asset, index) => ({
          campaignId: newCampaign.campaignId,
          assetId: asset.assetId,
          assetName: asset.assetName,
          clonedFigmaId: clonedFigmaIds[index].clonedFileId,
        }));
        const createdAssets = await CampaignDAO.bulkCreateCampaignAssets(campaignAssetsToCreate, transaction);

        await transaction.commit();
        logger.info(`Service: Campaign created successfully (ID: ${newCampaign.campaignId})`);

        // --- Step 3: Data Enrichment & Background Indexing ---
        try {
            const campaignDocForSearch: CampaignDocument = {
                campaignId: newCampaign.campaignId,
                campaignname: newCampaign.campaignName,
                description: newCampaign.description,
                status: newCampaign.status,
                fromdate: newCampaign.fromDate,
                todate: newCampaign.toDate,
                verticalId: newCampaign.verticalId,
                templateId: newCampaign.templateId,
                assets: createdAssets.map(a => a.assetId),
                createdAt: newCampaign.createdAt,
                verticalName: vertical.verticalName,
                templateName: template.templateName,
                createdByuserId: newCampaign.createdBy!,
                createdByName: campaignInput.createdByName,
            };
            await SearchService.addCampaignToIndex(campaignDocForSearch);
        } catch (searchError) {
            logger.error(`Failed to index campaign ${newCampaign.campaignId} after creation:`, searchError);
        }
        
        // --- Step 4: Format and Resolve with LEAN Output ---
        const campaignOut: CampaignCreateOut = {
            campaignId: newCampaign.campaignId,
            campaignname: newCampaign.campaignName,
            description: newCampaign.description,
            fromdate: newCampaign.fromDate,
            todate: newCampaign.toDate,
            verticalId: newCampaign.verticalId,
            templateId: newCampaign.templateId,
            assets: createdAssets.map(asset => asset.assetId),
            createdByUserID: newCampaign.createdBy as number,
            createdAt: newCampaign.createdAt.toISOString(),
        };
        return resolve(campaignOut);

      } catch (error: any) {
        await transaction.rollback();
        
        // Handle unique constraint violation for campaign name
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors) {
          const uniqueError = error.errors.find((err: any) => err.path === 'campaignName');
          if (uniqueError) {
            return reject(new Error(`A campaign with the name '${campaignInput.campaignname}' already exists.`));
          }
        }
        
        return reject(error);
      }
    });
  }
  public list(filters: any): Promise<CampaignListOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to list campaigns`);

        const options: FindOptions = { where: {}, include: [], order: [['createdAt', 'DESC']] };
        const whereClause: any = {};

        if (filters.status) whereClause.status = filters.status;
        if (filters.fromdate) whereClause.fromDate = { [Op.gte]: new Date(filters.fromdate) };
        if (filters.todate) whereClause.toDate = { [Op.lte]: new Date(filters.todate) };
        if (filters.templateId) whereClause.templateId = filters.templateId;
        if (filters.createdAtFrom) whereClause.createdAt = { [Op.gte]: new Date(filters.createdAtFrom) };
        if (filters.createdAtTo) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(filters.createdAtTo) };
        if (filters.verticalId) {
          (options.include as any).push({ model: Template, where: { verticalId: filters.verticalId }, required: true });
        }
        options.where = whereClause;
        const campaigns = await CampaignDAO.list(options);
        const count = campaigns.length;
        if (count === 0) {
          logger.info(`No campaigns found`);
        } else {
        const label = count === 1 ? 'campaign' : 'campaigns';
        logger.info(`Returned ${count} ${label}`);
        }

        resolve(
          campaigns.map(c => ({
            campaignId: c.campaignId,
            campaignname: c.campaignName,
            fromdate: c.fromDate,
            todate: c.toDate,
            status: c.status,
            verticalId: c.verticalId,
            templateId: c.templateId,
            createdBy: c.createdBy ?? null,
            createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
          }))
        );
      } catch (error: any) {
        reject(error);
      }
    });
  }

  public getById(campaignId: number): Promise<CampaignGetOut> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`Service: Attempting to fetch campaign by ID: ${campaignId}`);

      const campaign = await CampaignDAO.findById(campaignId);
      
      if (!campaign) {
        return reject(new Error('Campaign not found'));
      }
      
      const campaignOut: CampaignGetOut = {
        campaignId: campaign.campaignId,
        campaignname: campaign.campaignName,
        description: campaign.description,
        status: campaign.status,
        fromdate: campaign.fromDate,
        todate: campaign.toDate,
        verticalId: campaign.verticalId,
        templateId: campaign.templateId,
        assets: campaign.assets ? campaign.assets.map(asset => asset.assetId) : [],
        createdByUserID: campaign.createdBy ?? null,
        createdAt: campaign.createdAt.toISOString(),
      };

      logger.info(`Service: Fetched campaign by ID: ${campaignId}`);
      return resolve(campaignOut);
      
    } catch (error: any) {
      logger.error(`Service Error fetching campaign by ID ${campaignId}: ${error.message}`);
      return reject(error);
    }
  });
}

  public async uploadImage(
  campaignId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number; filename: string; s3Key: string }> {
  if (!campaignId) {
    return Promise.reject(new Error('campaignId is required'));
  }

  if (!file) {
    return Promise.reject(new Error('Image file is required'));
  }

  const s3Key = `campaigns/${campaignId}/images/${file.originalname}`;
  const bucket = process.env.IMAGE_BUCKET;

  if (!bucket) {
    logger.error('IMAGE_BUCKET environment variable is not set');
    return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    logger.info(`Successfully read file ${file.originalname}`);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
    try {
      await fs.unlink(file.path);
      logger.info(`Deleted local image file: ${file.originalname}`);
    } catch (unlinkErr) {
      logger.error(`Attempting to delete local file failed: ${file.path}`);
    }
    return { campaignId, filename: file.originalname, s3Key };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload image';
    return Promise.reject(new Error(message));
  }
}

  public async uploadCSV(
  campaignId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number; filename: string; s3Key: string }> {
  if (!campaignId) {
    return Promise.reject(new Error('campaignId is required'));
  }

  if (!file) {
    return Promise.reject(new Error('CSV file is required'));
  }

  const s3Key = `campaigns/${campaignId}/csv/${file.originalname}`;
  const bucket = process.env.IMAGE_BUCKET;

  if (!bucket) {
    logger.error('IMAGE_BUCKET environment variable is not set');
    return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    logger.info(`Successfully read file ${file.originalname}`);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
    try {
      await fs.unlink(file.path);
      logger.info(`Deleted local file: ${file.originalname}`);
    } catch (unlinkErr) {
    logger.error(`Failed to delete local file ${file.path}: ${(unlinkErr as Error).message}`);
    }
    return { campaignId, filename: file.originalname, s3Key };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload CSV';
    return Promise.reject(new Error(message));
  }
}

//  public async getCampaignImage(s3Prefix: string): Promise<Buffer> {
//   const bucket = process.env.IMAGE_BUCKET;
public async getCampaignImage(s3Prefix: string): Promise<Buffer> {
  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) {
    throw new Error('IMAGE_BUCKET is not defined in environment variables');
  }
  try {
    const objects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);
    if (!objects || objects.length === 0) {
      throw new Error('No file found for this prefix');
    }
    return objects[0].body;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve image';
    throw new Error(message);
  }
}

public async uploadExportedImages(
  campaignId: number,
  requestId: number,
  files: Express.Multer.File[]
): Promise<{ campaignId: number; requestId: number; filename: string; s3Key: string; message: string }[]> {
  if (!campaignId) throw new Error('campaignId is required');
  if (!requestId) throw new Error('requestId is required');
  if (!files || files.length === 0) throw new Error('No files provided');

  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const results = await Promise.all(
    files.map(async file => {
      const s3Key = `campaigns/${campaignId}/images/exported/${requestId}/${file.originalname}`;

      const existingObjects = await s3Service.getObjectsByPrefix(bucket, `campaigns/${campaignId}/images/exported/${requestId}/`);
      const alreadyExists = existingObjects.some(obj => obj.key === s3Key);

      if (alreadyExists) {
        return {
          campaignId,
          requestId,
          filename: file.originalname,
          s3Key,
          message: 'Image already exists for this requestId'
        };
      }

      const fileBuffer = await fs.readFile(file.path);
      await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
      try {
        await fs.unlink(file.path);
      } catch (unlinkErr) {
        logger.warn(`Failed to delete local file: ${file.path}`);
      }

      return {
        campaignId,
        requestId,
        filename: file.originalname,
        s3Key,
        message: 'Image uploaded successfully'
      };
    })
  );

  return results;
}

  public async getExportedImage(
    campaignId: number,
    requestId: number
  ): Promise<{ buffer: Buffer; contentType: string; s3Key: string }> {
    if (!campaignId) throw new Error('campaignId is required');
    if (!requestId) throw new Error('requestId is required');

    const bucket = process.env.IMAGE_BUCKET;
    if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

    const s3Prefix = `campaigns/${campaignId}/images/exported/${requestId}/`;

    const allObjects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);
    if (!allObjects || allObjects.length === 0) {
      throw new Error('Image not found for given campaignId and requestId');
    }

    // Take the first image
    const imageObject = allObjects[0];
    const buffer = imageObject.body as Buffer;
    const s3Key = imageObject.key;

    const ext = path.extname(s3Key).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    return { buffer, contentType, s3Key };
  }

// public async uploadAssetImage(
//   campaignId: number,
//   assetId: number,
//   requestId: number,
//   file: Express.Multer.File
// ): Promise<{ campaignId: number; assetId: number; requestId: number; s3Key: string }> {
//   // Validation
//   if (!campaignId || !assetId || !requestId) {
//     return Promise.reject(new Error('campaignId, assetId, and requestId are required'));
//   }

//   if (!file) {
//     return Promise.reject(new Error('Image file is required'));
//   }

//   const bucket = process.env.IMAGE_BUCKET;
//   if (!bucket) {
//     logger.error('IMAGE_BUCKET environment variable is not set');
//     return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
//   }

//   // Create S3 key including requestId for tracking
//   const s3Key = `campaigns/${campaignId}/assets/${assetId}/requests/${requestId}/${file.originalname}`;

//   try {
//     // Read file from local path
//     const fileBuffer = await fs.readFile(file.path);
//     logger.info(
//       `Uploading asset image: campaignId=${campaignId}, assetId=${assetId}, requestId=${requestId}, file=${file.originalname}`
//     );

//     // Upload to S3
//     await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);

//     // Delete local temp file after upload
//     try {
//       await fs.unlink(file.path);
//       logger.info(`Deleted local file: ${file.originalname}`);
//     } catch (unlinkErr) {
//       logger.warn(`Failed to delete temp file ${file.path}: ${(unlinkErr as Error).message}`);
//     }

//     logger.info(
//       `Image uploaded successfully for campaign ${campaignId}, asset ${assetId}, request ${requestId}`
//     );

//     return { campaignId, assetId, requestId, s3Key };
//   } catch (err: unknown) {
//     const message = err instanceof Error ? err.message : 'Failed to upload asset image';
//     logger.error(`Error uploading asset image: ${message}`);
//     return Promise.reject(new Error(message));
//   }
// }

public async uploadAssetImage(
  campaignId: number,
  assetId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number; assetId: number; s3Key: string; message: string }> {
  if (!campaignId || !assetId) throw new Error('campaignId and assetId are required');
  if (!file) throw new Error('Image file is required');

  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const s3Key = `campaigns/${campaignId}/assets/${assetId}${ext}`;
  const s3Prefix = `campaigns/${campaignId}/assets/${assetId}`;

  try {
    const existingObjects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);

    if (existingObjects && existingObjects.length > 0) {
      logger.info(`Image already exists for campaignId=${campaignId}, assetId=${assetId}`);
      return {
        campaignId,
        assetId,
        s3Key: existingObjects[0].key,
        message: 'Image already exists for this assetId',
      };
    }

    // ✅ Upload new file
    const fileBuffer = await fs.readFile(file.path);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);

    try {
      await fs.unlink(file.path);
    } catch (unlinkErr) {
      logger.warn(`Failed to delete temp file ${file.path}: ${(unlinkErr as Error).message}`);
    }

    logger.info(`Uploaded image to ${s3Key}`);
    return { campaignId, assetId, s3Key, message: 'Image uploaded successfully' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload asset image';
    logger.error(`Error uploading asset image: ${message}`);
    throw new Error(message);
  }
}

// public async uploadAssetImage(
//     campaignId: number,
//     assetId: number,
//     file: Express.Multer.File
//   ): Promise<{ campaignId: number; assetId: number; s3Key: string }> {
//     if (!campaignId || !assetId) {
//       return Promise.reject(new Error('campaignId and assetId are required'));
//     }

//     if (!file) {
//       return Promise.reject(new Error('Image file is required'));
//     }

//     const bucket = process.env.IMAGE_BUCKET;
//     if (!bucket) {
//       logger.error('IMAGE_BUCKET environment variable is not set');
//       return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
//     }

//     const s3Key = `campaigns/${campaignId}/images/${assetId}/${file.originalname}`;

//     try {
//       const fileBuffer = await fs.readFile(file.path);
//       logger.info(
//         `Uploading asset image: campaignId=${campaignId}, assetId=${assetId}, file=${file.originalname}`
//       );

//       await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);

//       try {
//         await fs.unlink(file.path);
//         logger.info(`Deleted local file: ${file.originalname}`);
//       } catch (unlinkErr) {
//         logger.warn(`Failed to delete temp file ${file.path}: ${(unlinkErr as Error).message}`);
//       }

//       logger.info(`Image uploaded successfully for campaign ${campaignId}, asset ${assetId}`);
//       return { campaignId, assetId, s3Key };
//     } catch (err: unknown) {
//       const message = err instanceof Error ? err.message : 'Failed to upload asset image';
//       logger.error(`Error uploading asset image: ${message}`);
//       return Promise.reject(new Error(message));
//     }
//   }

  // Get asset image
  // public async getAssetImage(
  //   campaignId: number,
  //   assetId: number,
  //   imageName: string
  // ): Promise<{ buffer: Buffer; key: string }> {
  //   const bucket = process.env.IMAGE_BUCKET;
  //   if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  //   const s3Prefix = `campaigns/${campaignId}/images/${assetId}/`;

  //   try {
  //     const allObjects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);

  //     if (!allObjects || allObjects.length === 0) {
  //       throw new Error('No images found for the given campaignId and assetId');
  //     }

  //     const imageObject = allObjects.find((obj: any) => obj.key.endsWith(`/${imageName}`));
  //     if (!imageObject) throw new Error('Image not found');

  //     const buffer = (imageObject.body as Buffer) || Buffer.from([]);
  //     const key = imageObject.key;
  //     return { buffer, key };
  //   } catch (err: unknown) {
  //     const message = err instanceof Error ? err.message : 'Failed to retrieve image';
  //     throw new Error(message);
  //   }
  // }


// export default new CampaignService();


//       logger.warn(`Failed to delete temp file ${file.path}: ${(unlinkErr as Error).message}`);
//     }

//     logger.info(`Uploaded image to ${s3Key}`);
//     return { campaignId, assetId, s3Key, message: 'Image uploaded successfully' };
//   } catch (err: unknown) {
//     const message = err instanceof Error ? err.message : 'Failed to upload asset image';
//     logger.error(`Error uploading asset image: ${message}`);
//     throw new Error(message);
//   }
// }

// ✅ Get Image by campaignId and assetId
public async getAssetImage(
  campaignId: number,
  assetId: number
): Promise<{ buffer: Buffer; key: string; contentType: string }> {
  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const s3Prefix = `campaigns/${campaignId}/assets/${assetId}`;
  const possibleExts = ['.jpg', '.jpeg', '.png'];

  try {
    const allObjects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);

    if (!allObjects || allObjects.length === 0) {
      throw new Error('Image not found for given campaignId and assetId');
    }

    const imageObject = allObjects.find((obj: any) =>
      possibleExts.some(ext => obj.key.endsWith(`${assetId}${ext}`))
    );

    if (!imageObject) throw new Error('Image not found for given assetId');

    const buffer = imageObject.body as Buffer;
    const key = imageObject.key;

    const ext = path.extname(key).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    return { buffer, key, contentType };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve image';
    throw new Error(message);
  }
}
}


export default new CampaignService();


