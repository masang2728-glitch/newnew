import type { VacationType, OvertimeSubType, IncidentType } from "./constants";

export type RequestType = "vacation" | "overtime";

export interface RequestEntry {
  id: string;
  team: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  createdAt: number; // epoch millis
  // 휴가 신청에만 존재
  leaveType?: VacationType;
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  destination?: string;
  reason?: string;
  // 야근 신청에만 존재
  subType?: OvertimeSubType;
  // 관리자 확인 여부
  confirmedAt?: number; // epoch millis
  confirmedBy?: string;
}

export interface TeamMember {
  team: string;
  name: string;
  orderNo: number;
  joinedAt: number; // epoch millis
}

// "사고관리": 출장/교육/휴직/공로/파견 - 직장 관리자가 직접 입력하는 기간 기반 기록.
// 달력에는 표시되지 않고, startDate~endDate 기간의 매일 사고현황표 집계에 포함된다.
export interface IncidentRecord {
  id: string;
  team: string;
  name: string;
  type: IncidentType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  note?: string;
  createdAt: number; // epoch millis
  createdBy?: string;
}
