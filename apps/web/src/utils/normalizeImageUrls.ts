export function normalizeImageUrls(values: Array<unknown> | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((item) => String(item ?? "").trim()).filter(Boolean)));
}