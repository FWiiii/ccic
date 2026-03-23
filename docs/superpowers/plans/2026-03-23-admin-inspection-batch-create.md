# CCIC Admin Inspection Batch Create Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-side batch-create workflow for inspections that generates sequential numeric SN values from a start SN and count, skips duplicates, and reports created vs skipped results.

**Architecture:** Keep the controller thin by extracting the batch SN generation and duplicate-splitting logic into a pure helper module under `apps/api/src/admin/`. Cover that helper with a low-friction Node test runner setup that works after `nest build`, then wire the new API route into the existing admin page with a dedicated modal and custom request flow.

**Tech Stack:** NestJS, TypeScript, Node built-in test runner, React 18, Refine, Ant Design, Vite

---

## File Structure

### Create

- `apps/api/src/admin/inspection-batch.ts`
  Pure helper functions for validating batch-create input, generating sequential SN values safely, and splitting candidate SNs into created vs skipped groups.
- `apps/api/test/inspection-batch.test.cjs`
  Node built-in tests that import the compiled helper from `dist/` and verify batch generation edge cases.

### Modify

- `apps/api/package.json`
  Add a test script that builds the API and runs Node tests.
- `apps/api/src/admin/admin.controller.ts`
  Add the `POST /api/admin/inspections/batch-create` endpoint using the helper module.
- `apps/admin/src/resources/pages.tsx`
  Add the batch-create button, modal, form, request submission, and result feedback for inspections.

### Notes

- Do not change Prisma schema or add database migrations.
- Do not reuse the single-record create modal for batch create; keep the flow separate.
- Keep the existing `docs/superpowers/plans/` and `docs/superpowers/specs/` structure intact.

## Task 1: Add Red Tests and a Minimal API Test Harness

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/test/inspection-batch.test.cjs`
- Test: `apps/api/test/inspection-batch.test.cjs`

- [ ] **Step 1: Write the failing batch helper tests**

Create `apps/api/test/inspection-batch.test.cjs` with assertions for:
- generating zero-padded sequential SNs from a numeric string start value
- preserving overflow without truncation (`9999 -> 10000`)
- skipping duplicates from an existing SN set while keeping other candidates
- rejecting non-numeric `startSn`
- rejecting `count < 1` and `count > 500`

The test should import `../dist/admin/inspection-batch.js`, which does not exist yet.

- [ ] **Step 2: Run the test to confirm RED**

Run: `npm --prefix apps/api run test`

Expected: FAIL because the new test script or compiled helper module does not exist yet.

- [ ] **Step 3: Add the minimal test script**

Update `apps/api/package.json`:

```json
{
  "scripts": {
    "test": "npm run build && node --test test/**/*.test.cjs"
  }
}
```

Keep the rest of the package unchanged.

## Task 2: Implement the Batch Helper and Make Tests Green

**Files:**
- Create: `apps/api/src/admin/inspection-batch.ts`
- Test: `apps/api/test/inspection-batch.test.cjs`

- [ ] **Step 1: Implement a pure helper for batch generation**

Add `apps/api/src/admin/inspection-batch.ts` with focused exports:

```ts
export interface InspectionBatchInput {
  startSn: string;
  count: number;
}

export const MAX_INSPECTION_BATCH_COUNT = 500;

export function buildInspectionSnCandidates(input: InspectionBatchInput): string[] {
  // validate startSn/count
  // generate candidates using BigInt
  // pad to the original length unless the incremented value is longer
}

export function splitInspectionBatchByExistingSn(
  candidates: string[],
  existingSnSet: ReadonlySet<string>
): { creatableSnList: string[]; skippedSnList: string[] } {
  // preserve candidate order
}
```

Validation rules:
- `startSn` must match `/^\d+$/`
- `count` must be an integer in `1..500`
- throw descriptive `Error`s for invalid input

- [ ] **Step 2: Run the tests to confirm GREEN**

Run: `npm --prefix apps/api run test`

Expected: PASS with the helper test file green.

## Task 3: Wire the New API Endpoint

**Files:**
- Modify: `apps/api/src/admin/admin.controller.ts`
- Modify: `apps/api/src/admin/inspection-batch.ts`

- [ ] **Step 1: Add request-to-response mapping in the controller**

Implement `POST /api/admin/inspections/batch-create` near the existing inspection routes.

Behavior:
- read `productId`, `companyId`, `startSn`, `count`, `inspectionTime`, `result`, `status`
- validate required fields and enums using the same standards as the single-create endpoint
- call the helper to generate candidate SNs
- inside `databaseService.mutateDb`, verify product and company existence, split by existing SNs, and create only non-duplicate inspections
- return:

```ts
{
  data: {
    createdCount,
    skippedCount,
    created,
    skippedSnList,
  },
}
```

- [ ] **Step 2: Re-run the API checks**

Run:
- `npm --prefix apps/api run test`
- `npm --prefix apps/api run build`

Expected:
- tests pass
- Nest build passes with the new endpoint and helper imports

## Task 4: Add the Admin Batch-Create Modal

**Files:**
- Modify: `apps/admin/src/resources/pages.tsx`

- [ ] **Step 1: Add a dedicated batch modal to `InspectionsPage`**

Implement a page-local modal instead of modifying `CrudResourcePage` behavior.

Required UI:
- a `批量生成` button in `headerActions`
- modal fields for `productId`, `companyId`, `startSn`, `count`, `inspectionTime`, `result`, `status`
- local validation for required fields, positive count, max count `500`, and numeric `startSn`

- [ ] **Step 2: Submit the batch request and show feedback**

Use the existing `adminRequest` helper in `pages.tsx` to call:

```ts
await adminRequest("/api/admin/inspections/batch-create", {
  method: "POST",
  body: JSON.stringify(payload),
});
```

On success:
- show `message.success("成功生成 X 条鉴定单")` when `skippedCount === 0`
- show `message.success("成功生成 X 条，跳过 Y 条")` when skips exist
- if `skippedCount > 0`, open `Modal.info` with the first 20 skipped SNs and a summary suffix for additional items
- close the modal and refresh the inspections table

Implementation detail:
- use `useInvalidate` or the page's existing list query invalidation pattern so the table refreshes immediately after success

- [ ] **Step 3: Run the admin build**

Run: `npm --prefix apps/admin run build`

Expected: PASS

## Task 5: End-to-End Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run full local verification**

Run:
- `npm --prefix apps/api run test`
- `npm --prefix apps/api run build`
- `npm --prefix apps/admin run build`

Expected: all pass

- [ ] **Step 2: Smoke-test the behavior manually if the local API is available**

If `apps/api` dev server is running, verify by:
1. authenticating with the existing admin login endpoint
2. calling `POST /api/admin/inspections/batch-create`
3. checking that duplicates are skipped and new records appear in `GET /api/admin/inspections`

If runtime verification is not possible in-session, report the gap explicitly in the final summary.
