-- Drop existing tables
DROP TABLE IF EXISTS campaignassets CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS verticals CASCADE;

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
    "templateName" VARCHAR(100) UNIQUE NOT NULL,
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
    "assetname" VARCHAR(100) UNIQUE NOT NULL,
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
    "campaignId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "assetname" VARCHAR(100),
    "clonedFigmaId" VARCHAR(100),
    PRIMARY KEY ("campaignId", "assetId"),
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("campaignId"),
    FOREIGN KEY ("assetId") REFERENCES "assets"("assetId"),
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),
    "deleted" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Inserting rows into verticals
INSERT INTO "verticals" ("verticalName", "createdBy", "updatedBy")
VALUES
  ('Marketing', 'admin', 'admin'),
  ('Sales', 'admin', 'admin'),
  ('Product', 'admin', 'admin'),
  ('Support', 'admin', 'admin'),
  ('Finance', 'admin', 'admin'),
  ('HR', 'admin', 'admin'),
  ('Engineering', 'admin', 'admin'),
  ('Operations', 'admin', 'admin'),
  ('Legal', 'admin', 'admin'),
  ('IT', 'admin', 'admin');

-- Inserting rows into templates
INSERT INTO "templates" ("templateName", "verticalId", "stylePrompt", "createdBy", "updatedBy")
VALUES
  ('Template A1', 1, 'Style prompt for A1', 'admin', 'admin'),
  ('Template A2', 1, 'Style prompt for A2', 'admin', 'admin'),
  ('Template B1', 2, 'Style prompt for B1', 'admin', 'admin'),
  ('Template B2', 2, 'Style prompt for B2', 'admin', 'admin'),
  ('Template C1', 3, 'Style prompt for C1', 'admin', 'admin'),
  ('Template C2', 3, 'Style prompt for C2', 'admin', 'admin'),
  ('Template D1', 4, 'Style prompt for D1', 'admin', 'admin'),
  ('Template D2', 4, 'Style prompt for D2', 'admin', 'admin'),
  ('Template E1', 5, 'Style prompt for E1', 'admin', 'admin'),
  ('Template E2', 5, 'Style prompt for E2', 'admin', 'admin');

-- Inserting rows into assets
INSERT INTO "assets" ("assetname", "description", "figmaURL", "figmaId", "verticalId", "templateId", "stylePrompt", "createdBy", "updatedBy")
VALUES
  ('Asset 1', 'Description 1', 'https://figma.com/asset1', 'figma01', 1, 1, 'Style A1', 'admin', 'admin'),
  ('Asset 2', 'Description 2', 'https://figma.com/asset2', 'figma02', 1, 2, 'Style A2', 'admin', 'admin'),
  ('Asset 3', 'Description 3', 'https://figma.com/asset3', 'figma03', 2, 3, 'Style B1', 'admin', 'admin'),
  ('Asset 4', 'Description 4', 'https://figma.com/asset4', 'figma04', 2, 4, 'Style B2', 'admin', 'admin'),
  ('Asset 5', 'Description 5', 'https://figma.com/asset5', 'figma05', 3, 5, 'Style C1', 'admin', 'admin'),
  ('Asset 6', 'Description 6', 'https://figma.com/asset6', 'figma06', 3, 6, 'Style C2', 'admin', 'admin'),
  ('Asset 7', 'Description 7', 'https://figma.com/asset7', 'figma07', 4, 7, 'Style D1', 'admin', 'admin'),
  ('Asset 8', 'Description 8', 'https://figma.com/asset8', 'figma08', 4, 8, 'Style D2', 'admin', 'admin'),
  ('Asset 9', 'Description 9', 'https://figma.com/asset9', 'figma09', 5, 9, 'Style E1', 'admin', 'admin'),
  ('Asset 10', 'Description 10', 'https://figma.com/asset10', 'figma10', 5, 10, 'Style E2', 'admin', 'admin');

-- Inserting rows into campaigns
INSERT INTO "campaigns" ("campaignName", "description", "fromDate", "toDate", "status", "verticalId", "templateId", "createdBy", "updatedBy")
VALUES
  ('Campaign 1', 'Campaign description 1', '2025-09-01 00:00:00+00', '2025-09-30 23:59:59+00', 'active', 1, 1, 'admin', 'admin'),
  ('Campaign 2', 'Campaign description 2', '2025-10-01 00:00:00+00', '2025-10-31 23:59:59+00', 'active', 1, 2, 'admin', 'admin'),
  ('Campaign 3', 'Campaign description 3', '2025-11-01 00:00:00+00', '2025-11-30 23:59:59+00', 'inactive', 2, 3, 'admin', 'admin'),
  ('Campaign 4', 'Campaign description 4', '2025-12-01 00:00:00+00', '2025-12-31 23:59:59+00', 'active', 2, 4, 'admin', 'admin'),
  ('Campaign 5', 'Campaign description 5', '2026-01-01 00:00:00+00', '2026-01-31 23:59:59+00', 'inactive', 3, 5, 'admin', 'admin'),
  ('Campaign 6', 'Campaign description 6', '2026-02-01 00:00:00+00', '2026-02-28 23:59:59+00', 'active', 3, 6, 'admin', 'admin'),
  ('Campaign 7', 'Campaign description 7', '2026-03-01 00:00:00+00', '2026-03-31 23:59:59+00', 'active', 4, 7, 'admin', 'admin'),
  ('Campaign 8', 'Campaign description 8', '2026-04-01 00:00:00+00', '2026-04-30 23:59:59+00', 'inactive', 4, 8, 'admin', 'admin'),
  ('Campaign 9', 'Campaign description 9', '2026-05-01 00:00:00+00', '2026-05-31 23:59:59+00', 'active', 5, 9, 'admin', 'admin'),
  ('Campaign 10', 'Campaign description 10', '2026-06-01 00:00:00+00', '2026-06-30 23:59:59+00', 'active', 5, 10, 'admin', 'admin');

-- Inserting rows into campaignassets (junction table)
INSERT INTO "campaignassets" ("campaignId", "assetId", "assetname", "clonedFigmaId", "createdBy", "updatedBy")
VALUES
  (1, 1, 'Asset 1', 'cloneFig01', 'admin', 'admin'),
  (1, 2, 'Asset 2', 'cloneFig02', 'admin', 'admin'),
  (2, 3, 'Asset 3', 'cloneFig03', 'admin', 'admin'),
  (2, 4, 'Asset 4', 'cloneFig04', 'admin', 'admin'),
  (3, 5, 'Asset 5', 'cloneFig05', 'admin', 'admin'),
  (3, 6, 'Asset 6', 'cloneFig06', 'admin', 'admin'),
  (4, 7, 'Asset 7', 'cloneFig07', 'admin', 'admin'),
  (4, 8, 'Asset 8', 'cloneFig08', 'admin', 'admin'),
  (5, 9, 'Asset 9', 'cloneFig09', 'admin', 'admin'),
  (5, 10, 'Asset 10', 'cloneFig10', 'admin', 'admin');
