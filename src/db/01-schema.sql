DROP TABLE IF EXISTS "campaignassets" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "assets" CASCADE;
DROP TABLE IF EXISTS "templates" CASCADE;
DROP TABLE IF EXISTS "verticals" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE; 

-- =================================================================
--                              USERS
-- =================================================================
-- Create users table
CREATE TABLE "users" (
    "userId" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(50) UNIQUE, 
    "refreshToken" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS "image_gen_requests" CASCADE;
DROP TABLE IF EXISTS "image_gen_requests" CASCADE;
-- Create verticals table
CREATE TABLE "verticals" (
    "verticalId" SERIAL PRIMARY KEY,
    "verticalName" VARCHAR(100) UNIQUE NOT NULL,
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create templates table
CREATE TABLE "templates" (
    "templateId" SERIAL PRIMARY KEY,
    "templateName" VARCHAR(100) NOT NULL,
    "verticalId" INTEGER NOT NULL REFERENCES "verticals"("verticalId"),
    "stylePrompt" TEXT,
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create assets table
CREATE TABLE "assets" (
    "assetId" SERIAL PRIMARY KEY,
    "assetname" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "figmaURL" VARCHAR(255),
    "figmaId" VARCHAR(100),
    "verticalId" INTEGER REFERENCES "verticals"("verticalId"),
    "templateId" INTEGER REFERENCES "templates"("templateId"),
    "stylePrompt" TEXT,
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE "campaigns" (
    "campaignId" SERIAL PRIMARY KEY,
    "campaignName" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "fromDate" TIMESTAMPTZ NOT NULL,
    "toDate" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(50),
    "verticalId" INTEGER NOT NULL REFERENCES "verticals"("verticalId"),
    "templateId" INTEGER NOT NULL REFERENCES "templates"("templateId"),
    "createdBy" INTEGER REFERENCES "users"("userId") ON DELETE SET NULL,
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaignassets table (junction table)
CREATE TABLE "campaignassets" (
    "campaignId" INTEGER NOT NULL REFERENCES "campaigns"("campaignId"),
    "assetId" INTEGER NOT NULL REFERENCES "assets"("assetId"),
    "assetname" VARCHAR(100),
    "clonedFigmaId" VARCHAR(100),
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("campaignId", "assetId")
);

CREATE TABLE IF NOT EXISTS image_gen_requests (
  id BIGSERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  campaignId INTEGER NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
  verticalId INTEGER NOT NULL REFERENCES "verticals"("verticalId") ON DELETE CASCADE,
  templateId INTEGER NOT NULL REFERENCES "templates"("templateId") ON DELETE CASCADE,
  use_ref_img BOOLEAN NOT NULL DEFAULT FALSE,
  use_template_prompt BOOLEAN NOT NULL DEFAULT FALSE,
  use_user_given_imgs BOOLEAN NOT NULL DEFAULT FALSE,
  user_given_imgs TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'requested',
  createdBy VARCHAR(100) NULL,
  updatedBy VARCHAR(100) NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create batch_requests table
CREATE TABLE IF NOT EXISTS "batch_requests" (
    "id" SERIAL PRIMARY KEY,
    "requestname" VARCHAR(255) NOT NULL,
    "csv_path" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_gen_requests (
  id BIGSERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  campaignId INTEGER NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
  verticalId INTEGER NOT NULL REFERENCES "verticals"("verticalId") ON DELETE CASCADE,
  templateId INTEGER NOT NULL REFERENCES "templates"("templateId") ON DELETE CASCADE,
  use_ref_img BOOLEAN NOT NULL DEFAULT FALSE,
  use_template_prompt BOOLEAN NOT NULL DEFAULT FALSE,
  use_user_given_imgs BOOLEAN NOT NULL DEFAULT FALSE,
  user_given_imgs TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'requested',
  createdBy VARCHAR(100) NULL,
  updatedBy VARCHAR(100) NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns for product image dimensions to existing assets table
ALTER TABLE campaigns
ADD UNIQUE ("campaignName");

ALTER TABLE "assets"
ADD COLUMN IF NOT EXISTS "prod_image_width" INTEGER DEFAULT 200;

ALTER TABLE "assets"
ADD COLUMN IF NOT EXISTS "prod_image_height" INTEGER DEFAULT 200;

ALTER TABLE "campaignassets"
ADD COLUMN IF NOT EXISTS "prod_image_width" INTEGER DEFAULT 200;

ALTER TABLE "campaignassets"
ADD COLUMN IF NOT EXISTS "prod_image_height" INTEGER DEFAULT 200;