# 작업 목록 (tsk.md)

`plan.md` 기준 실행 순서. 완료된 항목은 체크 표시.

## 0. 사전 준비 (사용자 액션 필요)
- [x] Supabase 프로젝트 생성 (supabase.com, 무료 티어) 후 URL / anon key 확보
- [x] Netlify 계정 생성/로그인 (netlify.com, 무료 티어)

## 1. 프로젝트 스캐폴딩
- [x] Vite + React + TypeScript 프로젝트 생성 (`vacation-overtime-pwa`)
- [x] 의존성 설치: `react-router-dom`, `@supabase/supabase-js`, `react-hot-toast`, `vite-plugin-pwa`
  (달력은 `react-day-picker` 대신 날짜별 인원수 배지 커스텀 렌더링이 필요해 자체 `MonthCalendar` 컴포넌트로 구현)
- [x] 기본 폴더 구조 생성

## 2. Supabase 연동
- [x] `.env` / `.env.example` 작성 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] `supabaseClient.ts` 작성
- [x] `vacation_requests`, `overtime_requests` 테이블 SQL (`supabase-schema.sql`) 실행
- [x] `api/requests.ts`: team-scoped CRUD + 실시간 구독 함수 작성
  - 알려진 이슈 수정: 팀명에 한글이 들어가면 Realtime `postgres_changes`의 `filter` 문자열이 매칭되지 않아,
    서버 필터 없이 테이블 전체를 구독하고 팀 필터링은 클라이언트의 `.eq('team', team)` 쿼리에서 처리하도록 변경함.

## 3. 세션 / 입장 화면
- [x] `SessionContext` (name/team/isAdmin, localStorage 영속화)
- [x] `NameEntryScreen`: 이름/팀명 입력, 관리자 PIN(선택), 유효성 검사

## 4. 메인 화면
- [x] `MainScreen`: 배너 2개(휴가/야근), 접속 정보 표시, "다른 이름/팀으로 전환"

## 5. 공용 컴포넌트
- [x] `MonthCalendar`: 월간 달력, 날짜 선택(다중/단일), 날짜별 인원수 배지, 월 이동
- [x] 07:00~17:00 1시간 단위 클릭 선택 (RequestScreen 내부 인라인 구현)
- [x] 조출/야근/둘다 선택 모달 (RequestScreen 내부 인라인 구현)

## 6. 휴가 신청 화면
- [x] 날짜 다중 선택 + 지난 날짜 비활성화
- [x] 휴가 유형 5종 선택 UI (연가/오전반차/오후반차/공가/청원)
- [x] 오전/오후반차 자동 시간 고정 로직
- [x] 시작/종료시간 슬롯 선택 + 검증(종료 > 시작)
- [x] 행선지 입력란
- [x] 공가/청원 사유 입력란(조건부 노출 + 필수 검증)
- [x] 중복 신청 검증 + 제출 + 토스트 피드백
- [x] "나의 신청 내역" / 관리자용 "전체 신청 내역 관리" + 취소

## 7. 야근 신청 화면
- [x] 날짜 클릭 → 조출/야근/둘다 모달
- [x] 선택 목록(칩) 표시 및 재선택/해제
- [x] 제출 시 "둘다" → 2건 생성
- [x] 중복 신청 검증 + 토스트 피드백
- [x] 신청 내역 / 관리자 전체 관리 + 취소

## 8. 캘린더 보기 (공용)
- [x] 월간 요약 바 (총 건수 · 인원수)
- [x] 날짜별 인원수 숫자 배지
- [x] 날짜 클릭 시 상세 신청자 목록
- [x] (휴가 전용) 월별 명단 리스트 (이름/유형/시간/행선지)

## 9. 관리자 권한
- [x] PIN 검증 로직
- [x] 관리자 시 전체 신청 목록 노출 + 타인 신청 취소 허용

## 10. PWA 설정
- [x] `vite-plugin-pwa` manifest 설정 (앱 이름, 테마색, 아이콘)
- [x] 아이콘 자산 준비 (192/512, maskable) — 기존 RN 버전 아이콘 재사용
- [x] 서비스워커 앱 셸 캐싱 확인 (빌드 시 `sw.js` / precache 14 entries 생성 확인)

## 11. 검증
- [x] `tsc --noEmit` / 빌드 통과
- [x] Playwright 스모크테스트: 입장 → 배너 → 휴가/야근 신청 → 캘린더 배지/명단 → 취소
- [x] Supabase에서 실제 행 생성/삭제 확인 (REST API 직접 조회로 검증)

## 12. Netlify 배포
- [x] `netlify.toml` 작성 (SPA redirect 포함)
- [x] `netlify login` (사용자 진행)
- [x] Netlify 사이트에 환경변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) 등록
- [x] `netlify deploy --prod` 실행 → 배포 URL: https://vacation-overtime-app.netlify.app
- [x] 배포 사이트가 기본적으로 "private(팀원만 접근)"으로 생성되어, 공개 접근되도록 `sso_login` / `account_sso_login` 설정을 해제함
- [ ] 실 사용자 모바일 기기에서 "홈 화면에 추가" 동작 확인 (사용자 확인 필요)
