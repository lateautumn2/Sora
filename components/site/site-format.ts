export function formatSoraDate(value: number | null): string {
  if (!value) return "未定日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未定日期";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getElapsedDays(value: number | null, currentTime = Date.now()): number {
  if (!value) return 0;
  return Math.max(0, Math.floor((currentTime - value) / 86_400_000));
}
