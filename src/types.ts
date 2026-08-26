import type { VacationType, OvertimeSubType } from "./constants";

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
