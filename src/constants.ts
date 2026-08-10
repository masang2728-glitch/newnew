// 관리자 2명이 공유해서 사용할 암호입니다.
// 배포 전에 반드시 이 값을 원하는 암호로 바꿔주세요.
export const ADMIN_PIN = "2957";

// 최고관리자(앱 전체 현황 조회/팀 삭제) 전용 암호. 팀 관리자 암호와는 별개입니다.
export const SUPER_ADMIN_PIN = "2728";

export const APP_CREATED_AT = "2026-07-30";
export const APP_AUTHOR = "윤상경";

// 휴가 유형 대분류 (버튼 3개로 표시)
export const VACATION_CATEGORIES = ["연가", "공가", "청원"] as const;
export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

// "연가" 클릭 시 팝업으로 고르는 세부 유형
export const LEAVE_SUBTYPES = ["1일 휴가", "오전반차", "오후반차", "외출"] as const;
export type LeaveSubType = (typeof LEAVE_SUBTYPES)[number];

export type VacationType = LeaveSubType | "공가" | "청원";

// 사유 기입란이 필요한 휴가 유형 ("공가"/"청원"은 팝업에서 바로 사유를 입력받는다)
export const REASON_REQUIRED_TYPES: VacationType[] = ["공가", "청원"];

// 자동으로 시작/종료시간이 채워지는 휴가 유형
export const HALF_DAY_PRESETS: Partial<Record<VacationType, { start: string; end: string }>> = {
  "1일 휴가": { start: "08:00", end: "17:00" },
  오전반차: { start: "08:00", end: "12:00" },
  오후반차: { start: "12:00", end: "17:00" },
};

// 시작/종료시간 선택용 1시간 단위 슬롯 (07:00 ~ 17:00)
export const HOUR_SLOTS: string[] = Array.from({ length: 11 }, (_, i) => {
  const hour = 7 + i;
  return `${String(hour).padStart(2, "0")}:00`;
});

export const OVERTIME_SUBTYPES = ["조출", "야근"] as const;
export type OvertimeSubType = (typeof OVERTIME_SUBTYPES)[number];
