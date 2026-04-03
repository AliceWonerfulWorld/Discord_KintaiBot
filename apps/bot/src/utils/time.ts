export function getNowInJst(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

export function getJstDateString(date = new Date()) {
  return getNowInJst(date).toISOString().slice(0, 10);
}

export function getJstMonthRange(date = new Date()) {
  const current = getNowInJst(date);
  const start = new Date(current.getFullYear(), current.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(current.getFullYear(), current.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  return { start, end };
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}時間${remainingMinutes}分`;
}
