export interface InspectionBatchInput {
  startSn: unknown;
  count: unknown;
}

export interface InspectionBatchSplitResult {
  creatableSnList: string[];
  skippedSnList: string[];
}

export const MAX_INSPECTION_BATCH_COUNT = 500;

const INSPECTION_BATCH_NUMERIC_SN_PATTERN = /^\d+$/;

export function buildInspectionSnCandidates(input: InspectionBatchInput): string[] {
  const startSn = String(input.startSn ?? "").trim();

  if (!INSPECTION_BATCH_NUMERIC_SN_PATTERN.test(startSn)) {
    throw new Error("startSn must be a numeric string");
  }

  const count = Number(input.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSPECTION_BATCH_COUNT) {
    throw new Error(`count must be between 1 and ${MAX_INSPECTION_BATCH_COUNT}`);
  }

  const startValue = BigInt(startSn);
  const width = startSn.length;
  const candidates: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const nextValue = (startValue + BigInt(index)).toString();
    candidates.push(nextValue.length >= width ? nextValue : nextValue.padStart(width, "0"));
  }

  return candidates;
}

export function splitInspectionBatchByExistingSn(
  candidates: string[],
  existingSnSet: ReadonlySet<string>
): InspectionBatchSplitResult {
  const creatableSnList: string[] = [];
  const skippedSnList: string[] = [];

  for (const candidate of candidates) {
    if (existingSnSet.has(candidate)) {
      skippedSnList.push(candidate);
      continue;
    }

    creatableSnList.push(candidate);
  }

  return {
    creatableSnList,
    skippedSnList,
  };
}
