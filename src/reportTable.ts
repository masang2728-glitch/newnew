// 사고현황표(구분/총원/사고/현재원 + 사고내용 10칸) 집계 로직.
// FactoryDashboardScreen(공장 전체)과 TeamDashboardScreen(우리 직장 한 줄)이 똑같이 사용한다.
import type { RequestEntry, IncidentRecord } from "./types";
import { categoryOfVacationType } from "./constants";

export type ReportColumn =
  | "휴가"
  | "청원휴가"
  | "병가"
  | "공가"
  | "외출"
  | "출장"
  | "교육"
  | "휴직"
  | "공로"
  | "파견"
  | "기타";

// 공장 현황 대시보드에서 쓰는 기본 10칸 (사진 속 사고현황표 그대로).
export const REPORT_COLUMNS: ReportColumn[] = [
  "휴가",
  "청원휴가",
  "병가",
  "공가",
  "출장",
  "교육",
  "휴직",
  "공로",
  "파견",
  "기타",
];

// 직장 대시보드에서만 우선 추가한 "외출" 열 - 일단 직장 대시보드에만 반영한다.
// "외출"은 사고로 집계되지 않으므로(사고/현재원 계산에서 제외) "사고 내용" 그룹과는 별개로,
// 표 맨 오른쪽에 붙는 열로 다룬다 - REPORT_COLUMNS(사고 집계 대상)와는 항상 분리해서 쓸 것.
export const TEAM_REPORT_COLUMNS: ReportColumn[] = [...REPORT_COLUMNS, "외출"];

type LeaveColumn = "휴가" | "청원휴가" | "병가" | "공가" | "외출" | "기타";

// "휴가" 열 = "연가" 대분류, "기타" 열 = "특별휴가" + "기타" 대분류 합산.
const CATEGORY_TO_COLUMN: Partial<Record<string, LeaveColumn>> = {
  연가: "휴가",
  청원휴가: "청원휴가",
  병가: "병가",
  공가: "공가",
  외출: "외출",
  특별휴가: "기타",
  기타: "기타",
};

// 휴가 유형 구조가 몇 차례 바뀌면서 예전에 저장된 leaveType 값은 지금의 SUBTYPES_BY_CATEGORY에
// 없을 수 있다. 그 옛 기록도 집계에서 빠지지 않도록 별도로 매핑해둔다.
const LEGACY_COLUMN: Partial<Record<string, LeaveColumn>> = {
  연가: "휴가",
  종일: "휴가",
  "1일 휴가": "휴가",
  오전반차: "휴가",
  오후반차: "휴가",
  공가: "공가",
  청원: "청원휴가",
  병가: "병가",
  오전: "기타",
  오후: "기타",
};

export function leaveColumnOf(entry: RequestEntry): LeaveColumn | null {
  const t = entry.leaveType;
  if (!t) return null;
  const category = categoryOfVacationType(t);
  if (category) return CATEGORY_TO_COLUMN[category] ?? null;
  return LEGACY_COLUMN[t] ?? null;
}

export function emptyReportCounts(): Record<ReportColumn, number> {
  return {
    휴가: 0,
    청원휴가: 0,
    병가: 0,
    공가: 0,
    외출: 0,
    출장: 0,
    교육: 0,
    휴직: 0,
    공로: 0,
    파견: 0,
    기타: 0,
  };
}

// 사고관리(출장/교육/휴직/공로/파견) 기록은 등록한 기간의 매일 집계에 포함된다 (달력 배지는 별도).
export function incidentActiveOnDate(record: IncidentRecord, date: string): boolean {
  return record.startDate <= date && date <= record.endDate;
}

export interface ReportRow {
  team: string;
  total: number; // 총원
  counts: Record<ReportColumn, number>;
  accident: number; // 사고 = 사고내용 10칸 합계
  current: number; // 현재원 = 총원 - 사고
}

export function buildReportRows(
  teams: string[],
  selectedDate: string,
  leaveEntries: RequestEntry[],
  incidents: IncidentRecord[],
  memberCountByTeam: Record<string, number>,
  columns: ReportColumn[] = REPORT_COLUMNS
): ReportRow[] {
  return teams.map((team) => {
    const counts = emptyReportCounts();
    for (const e of leaveEntries) {
      if (e.team !== team || e.date !== selectedDate || !e.confirmedAt) continue;
      const col = leaveColumnOf(e);
      if (col) counts[col] += 1;
    }
    for (const r of incidents) {
      if (r.team !== team) continue;
      if (!incidentActiveOnDate(r, selectedDate)) continue;
      counts[r.type] += 1;
    }
    const accident = columns.reduce((sum, c) => sum + counts[c], 0);
    const total = memberCountByTeam[team] ?? 0;
    return { team, total, counts, accident, current: total - accident };
  });
}

export function totalReportRow(rows: ReportRow[], label = "총계", columns: ReportColumn[] = REPORT_COLUMNS): ReportRow {
  const counts = emptyReportCounts();
  let total = 0;
  for (const row of rows) {
    total += row.total;
    for (const c of columns) counts[c] += row.counts[c];
  }
  const accident = columns.reduce((sum, c) => sum + counts[c], 0);
  return { team: label, total, counts, accident, current: total - accident };
}

// 캘린더 배지 숫자: 사고관리(출장/교육/휴직/공로/파견)는 제외하고, 확인된 휴가 신청 인원만 센다
// (요구사항: 사고관리 등록 인원은 달력에는 표시되지 않고 표에만 매일 집계된다).
export function confirmedLeaveCountByDate(entries: RequestEntry[]): Record<string, number> {
  const map: Record<string, Set<string>> = {};
  for (const e of entries) {
    if (!e.confirmedAt || !leaveColumnOf(e)) continue;
    if (!map[e.date]) map[e.date] = new Set();
    map[e.date].add(e.name);
  }
  const out: Record<string, number> = {};
  for (const d of Object.keys(map)) out[d] = map[d].size;
  return out;
}
