import type { RequestEntry } from "./types";

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
