-- Drop existing tables in reverse order of dependency to avoid errors
DROP TABLE IF EXISTS "campaignassets" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "assets" CASCADE;
DROP TABLE IF EXISTS "templates" CASCADE;
DROP TABLE IF EXISTS "verticals" CASCADE;
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
    "verticalId" INTEGER NOT NULL REFERENCES "verticals"("verticalId") ON DELETE CASCADE,
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
    "verticalId" INTEGER REFERENCES "verticals"("verticalId") ON DELETE CASCADE,
    "templateId" INTEGER REFERENCES "templates"("templateId") ON DELETE CASCADE,
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
    "verticalId" INTEGER NOT NULL REFERENCES "verticals"("verticalId") ON DELETE CASCADE,
    "templateId" INTEGER NOT NULL REFERENCES "templates"("templateId") ON DELETE CASCADE,
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaignassets table (junction table)
CREATE TABLE "campaignassets" (
    "campaignId" INTEGER NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "assetId" INTEGER NOT NULL REFERENCES "assets"("assetId") ON DELETE CASCADE,
    "assetname" VARCHAR(100),
    "clonedFigmaId" VARCHAR(100),
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("campaignId", "assetId")
);

ALTER TABLE campaigns
ADD UNIQUE ("campaignName");
