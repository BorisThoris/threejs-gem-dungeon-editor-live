/** Name the loot recorded by the theft/recovery action, without inferring it from later state. */
export function stolenLootLabel(gems: number, key: boolean): string {
  return [gems > 0 ? `${gems} gem${gems === 1 ? "" : "s"}` : "", key ? "your iron key" : ""]
    .filter(Boolean).join(" and ");
}
