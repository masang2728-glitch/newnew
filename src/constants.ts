// 관리자 2명이 공유해서 사용할 암호입니다.
// 배포 전에 반드시 이 값을 원하는 암호로 바꿔주세요.
export const ADMIN_PIN = "2957";

// 최고관리자(앱 전체 현황 조회/팀 삭제) 전용 암호. 팀 관리자 암호와는 별개입니다.
export const SUPER_ADMIN_PIN = "2728";

// 공장 관리자(소속 직장들을 합친 현황 조회) 전용 암호. 공장 전체가 공유해서 사용합니다.
export const FACTORY_ADMIN_PIN = "6301";

export const APP_CREATED_AT = "2026-07-30";
export const APP_AUTHOR = "윤상경";

// 휴가 유형 대분류 (버튼 7개로 표시). "외출"만 세부유형 없이 바로 선택된다.
export const VACATION_CATEGORIES = ["연가", "청원휴가", "병가", "공가", "특별휴가", "기타", "외출"] as const;
export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

// "연가" 클릭 시 팝업으로 고르는 세부 유형
export const LEAVE_SUBTYPES = ["연가(종일)", "연가(오전)", "연가(오후)"] as const;

// "청원휴가" 클릭 시 팝업으로 고르는 세부 유형
export const PETITION_SUBTYPES = ["직계가족간호", "결혼·출산·입양·사망", "자녀돌봄", "기타"] as const;

// "병가" 클릭 시 팝업으로 고르는 세부 유형
export const SICK_LEAVE_SUBTYPES = ["일반병가(본인진료)", "공무상병가"] as const;

// "공가" 클릭 시 팝업으로 고르는 세부 유형
export const OFFICIAL_LEAVE_SUBTYPES = ["일반공가", "공무상질병·부상"] as const;

// "특별휴가" 클릭 시 팝업으로 고르는 세부 유형
export const SPECIAL_LEAVE_SUBTYPES = ["근속", "포상·위로·보상·파병"] as const;

// "기타" 클릭 시 팝업으로 고르는 세부 유형
export const ETC_SUBTYPES = ["당직휴무", "대체·전투·교육생 등"] as const;

export type VacationType =
  | (typeof LEAVE_SUBTYPES)[number]
  | (typeof PETITION_SUBTYPES)[number]
  | (typeof SICK_LEAVE_SUBTYPES)[number]
  | (typeof OFFICIAL_LEAVE_SUBTYPES)[number]
  | (typeof SPECIAL_LEAVE_SUBTYPES)[number]
  | (typeof ETC_SUBTYPES)[number]
  | "외출";

// 대분류 클릭 시 팝업에 띄울 세부유형 목록. "외출"은 여기 없으므로 팝업 없이 바로 선택된다.
export const SUBTYPES_BY_CATEGORY: Partial<Record<VacationCategory, readonly VacationType[]>> = {
  연가: LEAVE_SUBTYPES,
  청원휴가: PETITION_SUBTYPES,
  병가: SICK_LEAVE_SUBTYPES,
  공가: OFFICIAL_LEAVE_SUBTYPES,
  특별휴가: SPECIAL_LEAVE_SUBTYPES,
  기타: ETC_SUBTYPES,
};

// 세부유형(또는 "외출") -> 대분류 역참조. 신청 화면에서 어떤 칩을 강조할지, 집계 화면에서 어떤
// 분류로 묶을지 판단할 때 쓴다.
const CATEGORY_OF_TYPE = new Map<VacationType, VacationCategory>();
(Object.keys(SUBTYPES_BY_CATEGORY) as VacationCategory[]).forEach((category) => {
  for (const subType of SUBTYPES_BY_CATEGORY[category] ?? []) CATEGORY_OF_TYPE.set(subType, category);
});
CATEGORY_OF_TYPE.set("외출", "외출");

export function categoryOfVacationType(vt: VacationType): VacationCategory | null {
  return CATEGORY_OF_TYPE.get(vt) ?? null;
}

// 자동으로 시작/종료시간이 채워지는 휴가 유형
export const HALF_DAY_PRESETS: Partial<Record<VacationType, { start: string; end: string }>> = {
  "연가(종일)": { start: "08:00", end: "17:00" },
  "연가(오전)": { start: "08:00", end: "12:00" },
  "연가(오후)": { start: "12:00", end: "17:00" },
};

export const OVERTIME_SUBTYPES = ["조출", "야근"] as const;
export type OvertimeSubType = (typeof OVERTIME_SUBTYPES)[number];
