export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function isPastDate(dateString: string): boolean {
  return dateString < todayString();
}

// 월요일 시작 (Mon, Tue, Wed, Thu, Fri, Sat, Sun 순)
export function getMonthGrid(year: number, month1to12: number): (Date | null)[] {
  const first = new Date(year, month1to12 - 1, 1);
  const startWeekday = (first.getDay() + 6) % 7; // JS: 0=Sun..6=Sat → 0=Mon..6=Sun
  const daysInMonth = new Date(year, month1to12, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month1to12 - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
