// 관리자 2명이 공유해서 사용할 암호입니다.
// 배포 전에 반드시 이 값을 원하는 암호로 바꿔주세요.
export const ADMIN_PIN = "2957";

// 최고관리자(앱 전체 현황 조회/팀 삭제) 전용 암호. 팀 관리자 암호와는 별개입니다.
export const SUPER_ADMIN_PIN = "2728";

// 공장 관리자(소속 직장들을 합친 현황 조회) 전용 암호. 공장 전체가 공유해서 사용합니다.
export const FACTORY_ADMIN_PIN = "6301";

export const APP_CREATED_AT = "2026-07-30";
export const APP_AUTHOR = "윤상경";

// 휴가 유형 대분류 (버튼 6개로 표시)
export const VACATION_CATEGORIES = ["연가", "공가", "청원", "병가", "근무휴식", "기타"] as const;
export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

// "연가" 클릭 시 팝업으로 고르는 세부 유형
export const LEAVE_SUBTYPES = ["연가(종일)", "연가(오전)", "연가(오후)", "외출"] as const;
export type LeaveSubType = (typeof LEAVE_SUBTYPES)[number];

// "근무휴식" 클릭 시 팝업으로 고르는 세부 유형
export const WORK_REST_SUBTYPES = ["오전", "오후", "종일"] as const;
export type WorkRestSubType = (typeof WORK_REST_SUBTYPES)[number];

export type VacationType = LeaveSubType | WorkRestSubType | "공가" | "청원" | "병가" | "기타";

// 사유 기입란이 필요한 휴가 유형 ("공가"/"청원"/"병가"/"기타"는 팝업에서 바로 사유를 입력받는다)
export const REASON_REQUIRED_TYPES: VacationType[] = ["공가", "청원", "병가", "기타"];

// 자동으로 시작/종료시간이 채워지는 휴가 유형
export const HALF_DAY_PRESETS: Partial<Record<VacationType, { start: string; end: string }>> = {
  "연가(종일)": { start: "08:00", end: "17:00" },
  "연가(오전)": { start: "08:00", end: "12:00" },
  "연가(오후)": { start: "12:00", end: "17:00" },
  오전: { start: "08:00", end: "12:00" },
  오후: { start: "12:00", end: "17:00" },
  종일: { start: "08:00", end: "17:00" },
};

export const OVERTIME_SUBTYPES = ["조출", "야근"] as const;
export type OvertimeSubType = (typeof OVERTIME_SUBTYPES)[number];
