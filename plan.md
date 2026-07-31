# 기술 구현 계획 (plan.md)

`spec.md`를 PWA + Supabase + Netlify 스택으로 구현하기 위한 기술 계획.

## 0. 데이터 보존 원칙 (모든 업데이트에 공통 적용)

- **프론트엔드 배포(Netlify)와 데이터(Supabase)는 완전히 분리되어 있다.** `netlify deploy`는 정적 화면 코드만 교체할 뿐 데이터베이스에는 전혀 영향을 주지 않으므로, 기능 추가/화면 변경/배포를 아무리 반복해도 기존 신청 데이터·팀·요청사항 게시글은 그대로 유지된다.
- 스키마 변경이 필요할 때는 항상 **추가(additive) 방식**만 사용한다: `create table if not exists`, `alter table ... add column if not exists` 등. 기존 컬럼 삭제, 테이블 재생성(drop & recreate), 데이터 이관이 필요한 변경은 하지 않는다.
- 부득이하게 파괴적 변경(컬럼 삭제/타입 변경 등)이 필요한 경우, 반드시 사전에 사용자에게 알리고 명시적 확인을 받은 뒤에만 진행한다.
- 로컬 세션(이름/팀/관리자 여부)은 브라우저 `localStorage`에 저장되며, 이 역시 앱 업데이트/재배포와 무관하게 유지된다.

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | React 18 + TypeScript | Vite 기반 |
| 빌드/개발서버 | Vite | 빠른 HMR, Netlify와 궁합 좋음 |
| PWA | `vite-plugin-pwa` | manifest.json + 서비스워커 자동 생성, 홈 화면 설치 지원 |
| 라우팅 | `react-router-dom` | 이름입장 / 메인 / 휴가 / 야근 4개 라우트 |
| 상태관리 | React Context (세션) + 컴포넌트 로컬 state | 별도 상태관리 라이브러리 불필요 |
| 데이터/백엔드 | Supabase (Postgres + 실시간 구독) | Firebase Firestore 대체 |
| 달력 UI | `react-day-picker` 또는 자체 구현 | RN 버전의 `react-native-calendars` 대응 웹 라이브러리 |
| 토스트 | `react-hot-toast` | RN 버전의 toast-message 대응 |
| 배포 | Netlify (CLI 또는 Git 연동) | 정적 사이트 호스팅 + 자동 배포 |

## 2. 프로젝트 구조

```
vacation-overtime-pwa/
  spec.md / plan.md / tsk.md
  index.html
  vite.config.ts
  netlify.toml
  src/
    main.tsx
    App.tsx                  // 라우터 + 세션 프로바이더
    constants.ts              // ADMIN_PIN, VACATION_TYPES, HOUR_SLOTS, HALF_DAY_PRESETS 등
    types.ts
    supabaseClient.ts
    session/
      SessionContext.tsx      // 이름/팀/관리자 상태, localStorage 영속화
    api/
      requests.ts             // Supabase CRUD + 실시간 구독 (팀/유형별 경로 분리)
    screens/
      NameEntryScreen.tsx
      MainScreen.tsx
      RequestScreen.tsx       // 휴가/야근 공용, type prop으로 분기 (RN 버전과 동일 패턴)
    components/
      MonthCalendar.tsx       // 날짜 선택 + 날짜별 인원수 배지 렌더링
      HourSlotPicker.tsx
      OvertimeSubTypeModal.tsx
    styles/ ...
  public/
    icons/ (PWA 아이콘 192/512, maskable)
    manifest 관련 자산
```

## 3. Supabase 데이터 모델

RLS(Row Level Security)는 비활성화하거나, "team 컬럼이 일치하는 행만" 허용하는 정도의 애플리케이션 레벨 필터로 처리한다 (spec 12번 항목의 무인증 한계를 그대로 승계).

```sql
create table vacation_requests (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  date date not null,
  leave_type text not null,        -- 연가/오전반차/오후반차/공가/청원
  start_time text,                 -- "HH:MM"
  end_time text,
  destination text,
  reason text,
  created_at timestamptz not null default now()
);

create table overtime_requests (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  date date not null,
  sub_type text not null,          -- 조출/야근
  created_at timestamptz not null default now()
);

create index on vacation_requests (team, date);
create index on overtime_requests (team, date);
```

- 팀별 격리는 모든 쿼리에 `.eq('team', teamName)` 필터를 강제하는 방식으로 구현 (requests.ts에서 팀 인자 없이는 호출 불가능한 함수 시그니처로 강제).
- 실시간 반영은 Supabase Realtime(`postgres_changes` 구독)으로 Firestore의 `onSnapshot`을 대체.
- 관리자 삭제 권한은 클라이언트 세션의 `isAdmin` 플래그로 UI 단에서 제어 (RN 버전과 동일한 한계).

## 4. 환경 변수 / 설정

- `.env` (Vite 규약상 `VITE_` 접두사 필요):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Netlify 배포 시 동일한 환경변수를 Netlify 사이트 설정(Environment variables)에도 등록해야 빌드 결과물에 반영된다.
- 관리자 PIN은 RN 버전과 동일하게 `constants.ts`에 상수로 두되(클라이언트에 노출되는 한계는 동일), 필요시 Netlify 환경변수로 분리 가능.

## 5. PWA 설정

- `vite-plugin-pwa`로 `manifest.json` 자동 생성: 앱 이름, 테마 색상(파랑/주황 중 대표색), 아이콘(192/512, maskable 포함).
- 아이콘은 기존 RN 버전에서 사용한 사용자 제공 이미지(클립보드+시계+해변)를 재사용.
- 오프라인 캐싱은 앱 셸(정적 자산)만 캐싱하고, Supabase 데이터는 네트워크 우선으로 처리 (오프라인 시 신청 불가 안내).

## 6. 라우팅 & 세션

- `/` : 이름 입장 (세션 없으면), 있으면 `/main`으로 리다이렉트
- `/main` : 배너 2개
- `/vacation` : 휴가 신청/캘린더 (신청하기·캘린더보기 탭은 화면 내부 상태로 처리, 별도 라우트 불필요)
- `/overtime` : 야근 신청/캘린더
- 세션(`name`, `team`, `isAdmin`)은 `localStorage`에 저장, `SessionContext`가 초기 로드 시 복원.

## 7. Netlify 배포

- `netlify.toml`:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
  (SPA 라우팅을 위한 catch-all redirect 필수 — 새로고침 시 404 방지)
- 배포는 Netlify CLI(`netlify deploy --prod`)로 진행하며, Netlify 계정 로그인이 최초 1회 필요 (Expo/EAS 로그인과 동일 패턴 — 사용자가 직접 터미널에서 `netlify login` 실행 필요할 수 있음).

## 8. 마이그레이션 매핑 (RN → PWA)

| RN(Expo) 요소 | PWA 대응 |
|---|---|
| `expo-router` / `@react-navigation` | `react-router-dom` |
| `AsyncStorage` | `localStorage` |
| `firebase/firestore` (`onSnapshot`, `addDoc`, `deleteDoc`) | `@supabase/supabase-js` (`select`, `insert`, `delete`, `channel().on('postgres_changes', ...)`) |
| `react-native-calendars` | `react-day-picker` (또는 자체 그리드 컴포넌트, 날짜별 인원수 배지 커스텀 렌더 필요) |
| `react-native-toast-message` | `react-hot-toast` |
| `Modal` (야근 조출/야근 선택) | 웹 모달(Dialog) 컴포넌트 |
| `eas build` (APK) | `netlify deploy` (정적 사이트) |

## 9. 검증 절차

1. `npm run build` 로컬 빌드 통과.
2. `npm run dev`로 로컬 기동 후 Playwright로 전체 플로우 스모크테스트 (RN 버전 검증 때와 동일 방식: 이름입장 → 배너 → 휴가/야근 신청 → 캘린더 인원수 배지 → 취소).
3. Supabase 테이블에 실제 행 생성/삭제 확인.
4. Netlify 배포 후 실제 배포 URL에서 모바일 브라우저 기준 반응형 확인 및 "홈 화면에 추가" 동작 확인.
