const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MAX_INSPECTION_BATCH_COUNT,
  buildInspectionSnCandidates,
  splitInspectionBatchByExistingSn,
} = require("../dist/admin/inspection-batch.js");

test("buildInspectionSnCandidates generates zero-padded sequential SN values", () => {
  assert.deepEqual(buildInspectionSnCandidates({ startSn: "0000123000", count: 3 }), [
    "0000123000",
    "0000123001",
    "0000123002",
  ]);
});

test("buildInspectionSnCandidates preserves overflow without truncation", () => {
  assert.deepEqual(buildInspectionSnCandidates({ startSn: "9999", count: 2 }), ["9999", "10000"]);
});

test("splitInspectionBatchByExistingSn keeps order while separating duplicates", () => {
  assert.deepEqual(
    splitInspectionBatchByExistingSn(["0001", "0002", "0003", "0004"], new Set(["0002", "0004"])),
    {
      creatableSnList: ["0001", "0003"],
      skippedSnList: ["0002", "0004"],
    }
  );
});

test("buildInspectionSnCandidates rejects non-numeric startSn", () => {
  assert.throws(
    () => buildInspectionSnCandidates({ startSn: "SN0001", count: 2 }),
    /startSn must be a numeric string/
  );
});

test("buildInspectionSnCandidates rejects count below one", () => {
  assert.throws(() => buildInspectionSnCandidates({ startSn: "0001", count: 0 }), /count must be between 1 and/);
});

test("buildInspectionSnCandidates rejects count above the limit", () => {
  assert.throws(
    () => buildInspectionSnCandidates({ startSn: "0001", count: MAX_INSPECTION_BATCH_COUNT + 1 }),
    /count must be between 1 and/
  );
});
