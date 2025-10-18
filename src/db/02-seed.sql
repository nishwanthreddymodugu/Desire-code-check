-- =================================================================
--                              USERS
-- =================================================================
-- Inserting a sample user to own the campaigns
INSERT INTO "users" ("name", "email", "password")
VALUES ('Satyam Kumar', 'satyam@example.com', '$2a$10$fow.E.qOCi9/6.i6.c.27u/vS4.jV.g/uS5.a.w/s.jH.x.y.z'); -- Example hashed password

-- Inserting rows into verticals
INSERT INTO "verticals" ("verticalName")
VALUES ('Marketing'), ('Sales'), ('Product'), ('Support'), ('Finance'), ('HR'), ('Engineering'), ('Operations'), ('Legal'), ('IT');

-- Inserting rows into templates
INSERT INTO "templates" ("templateName", "verticalId", "stylePrompt")
VALUES
  ('Template A1', 1, 'Style prompt for A1'), ('Template A2', 1, 'Style prompt for A2'),
  ('Template B1', 2, 'Style prompt for B1'), ('Template B2', 2, 'Style prompt for B2'),
  ('Template C1', 3, 'Style prompt for C1'), ('Template C2', 3, 'Style prompt for C2'),
  ('Template D1', 4, 'Style prompt for D1'), ('Template D2', 4, 'Style prompt for D2'),
  ('Template E1', 5, 'Style prompt for E1'), ('Template E2', 5, 'Style prompt for E2');

-- Inserting rows into assets
INSERT INTO "assets" ("assetname", "description", "figmaURL", "figmaId", "verticalId", "templateId", "stylePrompt", "prod_image_width", "prod_image_height")
VALUES
  ('Asset 1', 'Description 1', 'https://figma.com/asset1', 't85p6LbZ4l0Yx7tcsQBsEi', 1, 1, 'Style A1', 200, 200),
  ('Asset 2', 'Description 2', 'https://figma.com/asset2', 'figma02', 1, 2, 'Style A2', 200, 200),
  ('Asset 3', 'Description 3', 'https://figma.com/asset3', 'figma03', 2, 3, 'Style B1', 200, 200),
  ('Asset 4', 'Description 4', 'https://figma.com/asset4', 'figma04', 2, 4, 'Style B2', 200, 200),
  ('Asset 5', 'Description 5', 'https://figma.com/asset5', 'figma05', 3, 5, 'Style C1', 200, 200),
  ('Asset 6', 'Description 6', 'https://figma.com/asset6', 'figma06', 3, 6, 'Style C2', 200, 200),
  ('Asset 7', 'Description 7', 'https://figma.com/asset7', 'figma07', 4, 7, 'Style D1', 200, 200),
  ('Asset 8', 'Description 8', 'https://figma.com/asset8', 'figma08', 4, 8, 'Style D2', 200, 200),
  ('Asset 9', 'Description 9', 'https://figma.com/asset9', 'figma09', 5, 9, 'Style E1', 200, 200),
  ('Asset 10', 'Description 10', 'https://figma.com/asset10', 'figma10', 5, 10, 'Style E2', 200, 200);

-- Inserting rows into campaigns
-- The 'createdBy' column is now included, linking each campaign to the user with ID 1.
INSERT INTO "campaigns" ("campaignName", "description", "fromDate", "toDate", "status", "verticalId", "templateId", "createdBy")
VALUES
  ('Campaign 1', 'Campaign description 1', '2025-09-01', '2025-09-30', 'active', 1, 1, 1),
  ('Campaign 2', 'Campaign description 2', '2025-10-01', '2025-10-31', 'active', 1, 2, 1),
  ('Campaign 3', 'Campaign description 3', '2025-11-01', '2025-11-30', 'inactive', 2, 3, 1),
  ('Campaign 4', 'Campaign description 4', '2025-12-01', '2025-12-31', 'active', 2, 4, 1),
  ('Campaign 5', 'Campaign description 5', '2026-01-01', '2026-01-31', 'inactive', 3, 5, 1);
-- --------------------
-- Inserting rows into campaignassets
INSERT INTO "campaignassets" ("campaignId", "assetId", "assetname", "clonedFigmaId", "prod_image_width", "prod_image_height")
VALUES
  (1, 1, 'Asset 1', 'cloneFig01',200,200), (1, 2, 'Asset 2', 'cloneFig02',200,200),
  (2, 3, 'Asset 3', 'cloneFig03',200,200), (2, 4, 'Asset 4', 'cloneFig04',200,200),
  (3, 5, 'Asset 5', 'cloneFig05',200,200), (3, 6, 'Asset 6', 'cloneFig06',200,200),
  (4, 7, 'Asset 7', 'cloneFig07',200,200), (4, 8, 'Asset 8', 'cloneFig08',200,200),
  (5, 9, 'Asset 9', 'cloneFig09',200,200), (5, 10, 'Asset 10', 'cloneFig10',200,200);

