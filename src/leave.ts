import type { RequestEntry } from "./types";
import { getHolidayName } from "./holidays";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// "나의 휴가 사용 일수" 계산 기준 (연가만 센다, 하루 = 8시간)
// - 연가(종일) 1일, 연가(오전/오후) 0.5일
// - 외출: 시간 ÷ 8 (1시간 = 0.125일, 2시간 = 0.25일). 시간을 비워 둔 외출은 0.25일로 본다.
// - 청원휴가·병가·공가·특별휴가·기타는 세지 않는다.
export function leaveDaysOf(entry: RequestEntry): number {
  switch (entry.leaveType) {
    case "연가(종일)":
      return 1;
    case "연가(오전)":
    case "연가(오후)":
      return 0.5;
    case "외출": {
      if (entry.startTime && entry.endTime) {
        const minutes = toMinutes(entry.endTime) - toMinutes(entry.startTime);
        if (minutes > 0) return minutes / 60 / 8;
      }
      return 0.25;
    }
    default:
      return 0;
  }
}

// 0.375 → "0.375", 2.5 → "2.5", 3 → "3"
export function formatDays(days: number): string {
  return String(Number(days.toFixed(3)));
}

// 업무시간(08:00~17:00) 중 점심(12:00~13:00)을 뺀 실제 근무 분. 연가 외 휴가 일수 계산에 쓴다.
// 08:00~17:00 = 8시간(1일), 08:00~12:00 = 4시간(0.5일), 12:00~17:00 = 4시간(0.5일)
function workMinutes(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e <= s) return 0;
  const lunch = Math.max(0, Math.min(e, 13 * 60) - Math.max(s, 12 * 60));
  return e - s - lunch;
}

// 연가 외 휴가(청원·병가·공가·특별·기타)의 일수. 연가 차감과는 별개로 "얼마나 썼는지"만 보여준다.
// 시간이 없으면 1일, 있으면 근무시간 ÷ 8 (최대 1일).
export function otherLeaveDaysOf(entry: RequestEntry): number {
  if (!entry.startTime || !entry.endTime) return 1;
  const minutes = workMinutes(entry.startTime, entry.endTime);
  if (minutes <= 0) return 1;
  return Math.min(1, minutes / 60 / 8);
}

// 명단 한 줄 설명: "연가(종일) · 08:00~17:00 · 부산 · 사유: 가족 행사" (업데이트 전 표시 방식)
// 비어 있는 칸은 뺀다.
export function vacationDetail(entry: RequestEntry): string {
  const parts: string[] = [];
  if (entry.leaveType) parts.push(entry.leaveType);
  if (entry.startTime && entry.endTime) parts.push(`${entry.startTime}~${entry.endTime}`);
  if (entry.destination) parts.push(entry.destination);
  if (entry.reason) parts.push(`사유: ${entry.reason}`);
  return parts.join(" · ");
}

// 주말·공휴일이면 그 이유("주말" 또는 공휴일 이름)를, 평일이면 undefined를 돌려준다.
export function dayOffReason(date: string): string | undefined {
  const holiday = getHolidayName(date);
  if (holiday) return holiday;
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return weekday === 0 || weekday === 6 ? "주말" : undefined;
}

// 연가에서 실제로 차감되는 일수. 주말·공휴일에 올린 연가·외출은 내역에는 남기되 차감하지 않는다.
export function deductedLeaveDaysOf(entry: RequestEntry): number {
  return dayOffReason(entry.date) ? 0 : leaveDaysOf(entry);
}
