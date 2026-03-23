# CCIC Web Search Invalid Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `/search` so any non-empty input temporarily shows the invalid-query message while keeping the empty-input alert, and isolate the query decision behind a small placeholder adapter for future real API integration.

**Architecture:** Keep the current search page UI intact, extract the query-result decision into a dedicated helper module, and make `SearchPage` consume that helper instead of hardcoding success-vs-fail behavior. Verify the behavior with focused Vitest coverage for the helper and page interactions.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Vitest, Testing Library

---

## File Structure

### Create

- `apps/web/src/lib/search-validation.ts`
  Placeholder query adapter that currently returns `invalid` for any non-empty input and defines the future-facing result type.
- `apps/web/src/lib/__tests__/search-validation.test.ts`
  Unit tests for the placeholder adapter contract.

### Modify

- `apps/web/src/views/SearchPage.tsx`
  Remove the local expected-code success logic and route all non-empty submissions through the placeholder adapter.
- `apps/web/src/views/__tests__/SearchPage.test.tsx`
  Expand tests to cover empty-input alerts, always-invalid non-empty queries, and the removal of the success branch.

### Notes

- Do not change the route file at `apps/web/app/search/page.tsx` unless needed for typing cleanup.
- Keep `expectedCode` as a compatibility prop if that avoids broader changes, but it must no longer affect query success.
- Do not redesign the page or alter its CSS assets.

## Task 1: Write the Failing Tests First

**Files:**
- Create: `apps/web/src/lib/__tests__/search-validation.test.ts`
- Modify: `apps/web/src/views/__tests__/SearchPage.test.tsx`

- [ ] **Step 1: Add the failing helper test**

Create `apps/web/src/lib/__tests__/search-validation.test.ts` to assert:
- `resolveSearchValidationResult("1234")` returns `invalid`
- the helper ignores input content for now as long as the caller already handles empties

- [ ] **Step 2: Expand the failing page tests**

Update `apps/web/src/views/__tests__/SearchPage.test.tsx` to assert:
- empty input triggers `window.alert("防伪码必填")`
- non-empty input shows `此次查询无效 请仔细核对4位防伪编码输入是否正确`
- even when `expectedCode="1234"` and the user enters `1234`, the page still shows the invalid message
- `查询有效，验证成功` is not visible after a non-empty submission

- [ ] **Step 3: Run the tests to confirm RED**

Run:
- `npm --prefix apps/web run test -- --run src/lib/__tests__/search-validation.test.ts src/views/__tests__/SearchPage.test.tsx`

Expected:
- fail because the helper module does not exist yet and the page still allows the success path

## Task 2: Implement the Placeholder Search Adapter

**Files:**
- Create: `apps/web/src/lib/search-validation.ts`
- Test: `apps/web/src/lib/__tests__/search-validation.test.ts`

- [ ] **Step 1: Add the minimal helper**

Implement:

```ts
export type SearchValidationResult = "invalid";

export function resolveSearchValidationResult(_input: string): SearchValidationResult {
  return "invalid";
}
```

Keep it synchronous and side-effect free.

- [ ] **Step 2: Re-run the focused tests**

Run:
- `npm --prefix apps/web run test -- --run src/lib/__tests__/search-validation.test.ts`

Expected:
- helper test passes

## Task 3: Switch SearchPage to the New Adapter

**Files:**
- Modify: `apps/web/src/views/SearchPage.tsx`
- Modify: `apps/web/src/views/__tests__/SearchPage.test.tsx`

- [ ] **Step 1: Refactor the submit path**

Update `SearchPage` so that:
- empty input still alerts and returns early
- non-empty input always calls `resolveSearchValidationResult(input)`
- current placeholder result always maps to the fail branch
- the success branch is no longer reachable in current behavior
- static success-only info stays hidden in placeholder mode

- [ ] **Step 2: Run the focused tests to confirm GREEN**

Run:
- `npm --prefix apps/web run test -- --run src/lib/__tests__/search-validation.test.ts src/views/__tests__/SearchPage.test.tsx`

Expected:
- all focused tests pass

## Task 4: Final Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run web verification**

Run:
- `npm --prefix apps/web run test -- --run`
- `npm --prefix apps/web run build`

Expected:
- tests pass
- Next build passes

- [ ] **Step 2: Note residual scope**

Record in the final summary:
- `/search` is intentionally hardwired to invalid for any non-empty input
- the new helper is the future integration seam for a real query API
