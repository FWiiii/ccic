# CCIC Inspection Query Design

## 1. Business Goal

The QR code opens the web page:

- `http://localhost:5173/trace?sn=0000123456`

`sn` is the inspection code for one product. The page should query and display:

- Product name
- Consignor company name
- Inspection time
- Inspection images
- Inspection timeline/events
- Inspection conclusion (pass/fail/pending)

## 2. Architecture

The system uses 3 applications:

- `apps/web`: public inspection result page
- `apps/admin`: admin CMS for inspection records
- `apps/api`: unified backend API

Flow:

1. User scans QR code and opens `/trace?sn=...`
2. Web calls `GET /api/v1/public/inspection?sn=...`
3. API returns one aggregate inspection payload
4. Web renders product/company/conclusion/images/timeline

## 3. Data Model (Recommended)

Core model is `inspection` (one `sn` maps to one inspection record).

- `companies`: company master data
- `products`: product master data
- `inspections`:
  - `sn` (unique)
  - `productId`
  - `companyId`
  - `inspectionTime`
  - `result` (`PASS|FAIL|PENDING`)
  - `status` (`DRAFT|REVIEWED|PUBLISHED|REVOKED`)
  - `conclusion`
  - `productNameSnapshot`
  - `companyNameSnapshot`
- `inspectionImages`:
  - `inspectionId`
  - `assetId`
  - `scene` (`HERO|DETAIL|CERT|OTHER`)
  - `sortOrder`
- `inspectionEvents`:
  - `inspectionId`
  - `eventTime`
  - `eventType`
  - `title`
  - `content`
  - `sortOrder`
- `mediaAssets`: reusable media metadata

## 4. Public API

- `GET /api/v1/public/inspection?sn={sn}`

Response:

- inspection basic info and result
- product and company info
- ordered images
- ordered timeline events

Only `PUBLISHED` inspection records are returned to public users.

## 5. Admin Product Design

Main menu should be inspection-centric:

1. Inspection Records (main workflow)
2. Product Master Data
3. Company Master Data
4. Media Center
5. Query Logs
6. Audit Logs

## 6. States and Roles

Inspection state machine:

- `DRAFT -> REVIEWED -> PUBLISHED -> REVOKED`

Recommended roles:

- `OPERATOR`: edit data
- `REVIEWER`: review
- `PUBLISHER`: publish/revoke
- `ADMIN`: full permissions

## 7. Refactor Sequence

1. Add inspection aggregate model + public aggregate API.
2. Build admin inspection management page.
3. Connect web `/trace?sn=` page to the new public API.
4. Migrate storage from JSON file to PostgreSQL.
