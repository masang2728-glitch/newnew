# 휴가/야근 신청 캘린더 - 전체 코드 문서

**프로젝트명:** vacation-overtime-pwa  
**언어:** TypeScript + React 19  
**빌드 도구:** Vite  
**배포:** Netlify  
**데이터베이스:** Supabase (PostgreSQL)  
**제작자:** 윤상경  
**생성일:** 2026-07-30

---

## 📋 프로젝트 개요

팀별로 휴가와 야근을 신청하고 공유할 수 있는 웹 애플리케이션입니다.

**주요 기능:**
- 사용자 이름/팀명으로 로그인
- 휴가 신청 (종일/반차/공가/청원 등)
- 야근 신청 (조출/야근)
- 팀별 공유 캘린더 조회
- 관리자 기능 (전체 관리)
- 최고관리자 기능 (앱 전체 현황 조회, 팀 삭제)
- 요청사항 게시판

---

## 🔧 기술 스택

### Dependencies
```json
{
  "@supabase/supabase-js": "^2.111.0",
  "date-fns": "^4.4.0",
  "react": "^19.2.8",
  "react-dom": "^19.2.8",
  "react-hot-toast": "^2.6.0",
  "react-router-dom": "^7.18.2"
}
```

### DevDependencies
```json
{
  "@types/node": "^24.13.3",
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3",
  "@vitejs/plugin-react": "^6.0.4",
  "oxlint": "^1.75.0",
  "playwright": "^1.62.1",
  "typescript": "~6.0.2",
  "vite": "^8.2.0",
  "vite-plugin-pwa": "^1.3.0"
}
```

---

## 📁 프로젝트 구조

```
vacation-overtime-pwa/
├── src/
│   ├── api/
│   │   ├── admin.ts           (최고관리자 기능 API)
│   │   ├── feedback.ts        (요청사항 API)
│   │   └── requests.ts        (휴가/야근 신청 API)
│   ├── components/
│   │   └── MonthCalendar.tsx  (월별 캘린더 컴포넌트)
│   ├── screens/
│   │   ├── AppInfoScreen.tsx         (앱 정보 화면)
│   │   ├── MainScreen.tsx            (메인 화면)
│   │   ├── NameEntryScreen.tsx       (로그인 화면)
│   │   ├── RequestScreen.tsx         (신청 화면)
│   │   └── SuperAdminScreen.tsx      (최고관리자 화면)
│   ├── session/
│   │   └── SessionContext.tsx (세션 관리)
│   ├── App.tsx               (메인 앱)
│   ├── main.tsx              (진입점)
│   ├── types.ts              (타입 정의)
│   ├── constants.ts          (상수)
│   ├── dateUtils.ts          (날짜 유틸리티)
│   ├── holidays.ts           (한국 공휴일)
│   ├── index.css             (스타일)
│   └── supabaseClient.ts    (Supabase 클라이언트)
├── public/
│   ├── favicon.svg
│   └── icons/               (PWA 아이콘)
├── package.json
├── vite.config.ts
├── netlify.toml            (Netlify 배포 설정)
└── README.md
```

---

## 🔐 인증 및 암호

### 관리자 암호
```typescript
export const ADMIN_PIN = "2957";
```
팀 관리자가 사용하는 암호입니다. 같은 팀이면 같은 암호를 사용해야 하고, 관리자 기능에 접근할 수 있습니다.

### 최고관리자 암호
```typescript
export const SUPER_ADMIN_PIN = "2728";
```
앱 전체를 관리하는 최고관리자만 사용할 수 있습니다.

---

## 📝 타입 정의 (types.ts)

```typescript
// 요청 타입 (휴가 또는 야근)
export type RequestType = "vacation" | "overtime";

// 신청 항목의 데이터 구조
export interface RequestEntry {
  id: string;
  name: string;                        // 신청자 이름
  date: string;                        // "YYYY-MM-DD"
  createdAt: number;                   // 신청 시간 (epoch millis)
  
  // 휴가 신청에만 존재
  leaveType?: VacationType;            // 휴가 유형
  startTime?: string;                  // "HH:MM"
  endTime?: string;                    // "HH:MM"
  destination?: string;                // 행선지
  reason?: string;                     // 사유
  
  // 야근 신청에만 존재
  subType?: OvertimeSubType;           // "조출" | "야근"
}
```

---

## ⚙️ 상수 정의 (constants.ts)

```typescript
// 휴가 유형
export const VACATION_TYPES = ["연가", "종일", "오전반차", "오후반차", "공가", "청원"];
export type VacationType = (typeof VACATION_TYPES)[number];

// 사유 기입이 필수인 휴가 유형
export const REASON_REQUIRED_TYPES: VacationType[] = ["공가", "청원"];

// 자동으로 시간이 채워지는 휴가
export const HALF_DAY_PRESETS = {
  종일: { start: "08:00", end: "17:00" },
  오전반차: { start: "08:00", end: "12:00" },
  오후반차: { start: "12:00", end: "17:00" },
};

// 시간 슬롯 (07:00 ~ 17:00, 1시간 단위)
export const HOUR_SLOTS = ["07:00", "08:00", "09:00", ..., "17:00"];

// 야근 유형
export const OVERTIME_SUBTYPES = ["조출", "야근"];
export type OvertimeSubType = (typeof OVERTIME_SUBTYPES)[number];
```

---

## 🗓️ 날짜 유틸리티 (dateUtils.ts)

```typescript
// 날짜를 "YYYY-MM-DD" 형식의 문자열로 변환
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 오늘 날짜를 문자열로
export function todayString(): string {
  return toDateString(new Date());
}

// 지난 날짜인지 확인
export function isPastDate(dateString: string): boolean {
  return dateString < todayString();
}

// 월별 달력 그리드 생성 (월요일 시작)
export function getMonthGrid(year: number, month1to12: number): (Date | null)[] {
  const first = new Date(year, month1to12 - 1, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month1to12, 0).getDate();
  const cells: (Date | null)[] = [];
  
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month1to12 - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  
  return cells;
}
```

---

## 🎉 공휴일 (holidays.ts)

```typescript
// 2026년 대한민국 법정공휴일
export const KR_HOLIDAYS_2026: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  // ... (총 21개 공휴일)
};

export function getHolidayName(dateString: string): string | undefined {
  return KR_HOLIDAYS_2026[dateString];
}
```

---

## 🔗 API 통신 (Supabase)

### 신청 API (api/requests.ts)

```typescript
// 팀의 신청 목록 구독 (실시간 업데이트)
export function subscribeToRequests(
  team: string,
  type: RequestType,
  onChange: (entries: RequestEntry[]) => void,
  onError?: (error: unknown) => void
): () => void

// 신청 생성
export async function createRequest(
  team: string,
  type: RequestType,
  name: string,
  date: string,
  extra?: Partial<Pick<RequestEntry, ...>>
): Promise<void>

// 신청 취소
export async function cancelRequest(
  type: RequestType,
  id: string
): Promise<void>
```

### 요청사항 API (api/feedback.ts)

```typescript
export interface FeedbackPost {
  id: string;
  name: string;
  team: string | null;
  content: string;
  createdAt: number;
}

// 요청사항 구독
export function subscribeToFeedback(
  onChange: (posts: FeedbackPost[]) => void,
  onError?: (error: unknown) => void
): () => void

// 요청사항 작성
export async function createFeedback(
  name: string,
  team: string | null,
  content: string
): Promise<void>
```

### 최고관리자 API (api/admin.ts)

```typescript
export interface TeamSummary {
  team: string;
  headcount: number;
  vacationCount: number;
  overtimeCount: number;
  lastActivity: number;
}

export interface AppSummary {
  teams: TeamSummary[];
  totalTeams: number;
  totalPeople: number;
  totalVacation: number;
  totalOvertime: number;
}

// 앱 전체 현황 조회
export async function fetchAppSummary(): Promise<AppSummary>

// 팀 삭제 (팀의 모든 신청 데이터 제거)
export async function deleteTeam(team: string): Promise<void>
```

---

## 🛂 세션 관리 (session/SessionContext.tsx)

```typescript
interface SessionContextValue {
  userName: string | null;              // 현재 사용자 이름
  teamName: string | null;              // 현재 팀명
  isAdmin: boolean;                      // 관리자 여부
  isSuperAdmin: boolean;                 // 최고관리자 여부
  isLoading: boolean;                    // 초기 로딩 중
  
  // 팀 관리자로 로그인
  login: (name: string, team: string, pin: string) => { ok: true } | { ok: false; error: string }
  
  // 최고관리자로 로그인
  loginSuperAdmin: (code: string) => { ok: true } | { ok: false; error: string }
  
  // 로그아웃
  logout: () => void
}

// localStorage 키
const NAME_KEY = "session:userName";
const TEAM_KEY = "session:teamName";
const ADMIN_KEY = "session:isAdmin";
const SUPER_ADMIN_KEY = "session:isSuperAdmin";
```

---

## 🎨 컴포넌트

### MonthCalendar (components/MonthCalendar.tsx)

```typescript
interface MonthCalendarProps {
  month: string;                              // "YYYY-MM"
  onMonthChange: (month: string) => void;     // 월 변경 핸들러
  minDate?: string;                           // 선택 가능한 최소 날짜
  selectedDates?: Set<string>;                // 선택된 날짜 (복수)
  singleSelectedDate?: string | null;         // 선택된 날짜 (단일)
  countByDate?: Record<string, number>;       // 날짜별 신청 건수
  onDayClick: (dateString: string) => void;   // 날짜 클릭 핸들러
  themeColor: string;                         // 테마 색상 (#RRGGBB)
}
```

**기능:**
- 월별 달력 표시
- 토요일: 파란색 (#2563EB)
- 일요일/공휴일: 빨간색 (#DC2626)
- 오늘: 테마 색상으로 강조
- 선택된 날짜: 테마 색상 배경
- 과거 날짜 비활성화 가능

---

## 📱 화면 (Screens)

### 1. NameEntryScreen (로그인)

**기능:**
- 이름 입력
- 팀명 입력
- 관리자 암호 (선택)
- 최고관리자 암호 (선택)

**라우팅:** `/` → `/main` 또는 `/super-admin`

### 2. MainScreen (메인)

**버튼:**
- 휴가 신청 → `/vacation`
- 야근 신청 → `/overtime`
- 앱 정보 → `/app-info`
- 다른 이름/팀으로 전환 → `/`

### 3. RequestScreen (신청/캘린더)

**두 가지 탭:**

#### 신청하기 탭
- 달력에서 날짜 선택
- 휴가 유형 선택
- 시간 입력 (선택)
- 행선지 입력 (선택)
- 사유 입력 (필수 휴가 유형의 경우)
- 야근 선택 (조출/야근/둘다)
- 신청 버튼
- 내 신청 내역 조회 (일반) / 전체 신청 내역 (관리자)

#### 캘린더 보기 탭
- 월별 달력 조회
- 날짜별 신청자 조회
- 월별 신청 현황 (건수, 인원)
- 월별 휴가 명단 (휴가의 경우)

### 4. AppInfoScreen (앱 정보)

**표시:**
- 생성일: 2026-07-30
- 제작자: 윤상경

**요청사항 게시판:**
- 새로운 요청사항 작성
- 등록된 요청사항 목록 조회

### 5. SuperAdminScreen (최고관리자)

**통계:**
- 전체 팀 수
- 전체 이용 인원
- 휴가 신청 건수
- 야근 신청 건수

**팀 관리:**
- 각 팀별 통계
- 팀 삭제 기능

---

## 🗺️ 라우팅 (App.tsx)

```typescript
<HashRouter>
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    
    <Route path="/main" element={<RequireSession><MainScreen /></RequireSession>} />
    
    <Route path="/vacation" element={
      <RequireSession>
        <RequestScreen type="vacation" title="휴가" themeColor="#2563EB" />
      </RequireSession>
    } />
    
    <Route path="/overtime" element={
      <RequireSession>
        <RequestScreen type="overtime" title="야근" themeColor="#F97316" />
      </RequireSession>
    } />
    
    <Route path="/app-info" element={
      <RequireSession><AppInfoScreen /></RequireSession>
    } />
    
    <Route path="/super-admin" element={
      <RequireSuperAdmin><SuperAdminScreen /></RequireSuperAdmin>
    } />
  </Routes>
</HashRouter>
```

---

## 💾 데이터베이스 스키마 (Supabase)

### vacation_requests 테이블
```sql
CREATE TABLE vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  leave_type VARCHAR(50),
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  destination TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### overtime_requests 테이블
```sql
CREATE TABLE overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  sub_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);
```

### feedback_posts 테이블
```sql
CREATE TABLE feedback_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  team VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🌐 배포 설정

### Netlify (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vite (vite.config.ts)
```typescript
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '휴가/야근 신청 캘린더',
        short_name: '휴가야근신청',
        description: '팀별 휴가/야근 신청 공유 캘린더',
        start_url: '/',
        display: 'standalone',
        background_color: '#1C376C',
        theme_color: '#2563EB',
      },
    }),
  ],
})
```

---

## 🔄 상태 관리 흐름

```
User
  ↓
NameEntryScreen (로그인)
  ↓ login() → SessionContext (localStorage 저장)
  ↓
MainScreen (메인 화면)
  ↓ (선택)
  ├→ RequestScreen (휴가/야근 신청)
  │   ├→ MonthCalendar (달력)
  │   ├→ subscribeToRequests (실시간 구독)
  │   └→ createRequest / cancelRequest (API)
  │
  ├→ AppInfoScreen (앱 정보)
  │   ├→ subscribeToFeedback (실시간 구독)
  │   └→ createFeedback (API)
  │
  └→ SuperAdminScreen (최고관리자)
      ├→ fetchAppSummary (조회)
      └→ deleteTeam (팀 삭제)
```

---

## 📦 주요 라이브러리 역할

| 라이브러리 | 역할 |
|----------|------|
| **react-router-dom** | 클라이언트 라우팅 (SPA 네비게이션) |
| **react-hot-toast** | 토스트 알림 |
| **@supabase/supabase-js** | 백엔드 API, 실시간 구독 |
| **date-fns** | 날짜 조작 (현재는 직접 구현) |
| **vite-plugin-pwa** | PWA 지원 (오프라인 작동) |

---

## 🚀 개발 및 빌드 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint

# 빌드 결과 미리보기
npm run preview
```

---

## 🔑 환경 변수 (.env)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxx
```

---

## 🎯 핵심 로직 요약

### 휴가 신청 흐름
1. 사용자가 달력에서 날짜 선택
2. 휴가 유형 선택 (또는 시간 선택)
3. 행선지, 사유 등 선택적 정보 입력
4. "신청 확인" 버튼 클릭
5. `createRequest()` API 호출
6. Supabase에 저장
7. 실시간 구독으로 화면 업데이트

### 야근 신청 흐름
1. 사용자가 달력에서 날짜 선택
2. 야근 종류 선택 (조출/야근/둘다)
3. "신청 확인" 버튼 클릭
4. 각 유형별로 `createRequest()` 호출
5. Supabase에 저장
6. 실시간 구독으로 화면 업데이트

### 캘린더 조회 흐름
1. "캘린더 보기" 탭 선택
2. 월별 캘린더 표시
3. 각 날짜에 신청 건수 표시
4. 날짜 클릭 시 해당 날짜의 신청자 목록 표시
5. 일반 사용자: 본인 신청만 취소 가능
6. 관리자: 모든 신청 취소 가능

---

## 🔒 보안 고려사항

1. **암호 저장:** 환경 변수로 관리 (코드에 하드코딩)
2. **세션 저장:** localStorage 사용 (클라이언트)
3. **권한 검증:** 클라이언트 라우터에서만 체크 (본격 사용 시 서버 검증 필요)
4. **실시간 구독 필터:** 팀명 기반 (non-ASCII 문자 주의)

---

## 📝 추가 노트

- **지난 날짜 신청 방지:** `isPastDate()` 검증
- **중복 신청 방지:** `myDatesAlready` Set으로 확인
- **시간 유효성 검사:** 종료시간 > 시작시간
- **한글 공휴일:** 2026년 기준 (매년 업데이트 필요)
- **PWA 지원:** 오프라인 모드에서도 기존 데이터 조회 가능

---

## 🎨 스타일링

메인 CSS: `src/index.css`

**주요 스타일 클래스:**
- `.entry-screen` - 로그인 화면
- `.main-screen` - 메인 화면
- `.request-screen` - 신청 화면
- `.calendar` - 달력
- `.banner` - 메인 버튼
- `.chip` - 태그/칩
- `.submit-button` - 제출 버튼
- `.cancel-link` - 취소 링크

---

## 🔄 향후 개선 사항

1. 서버 기반 권한 검증
2. 다중 팀 관리 기능
3. 월별 통계 리포트
4. 이메일 알림
5. 일정 조회 API
6. 승인 워크플로우
7. 데이터 백업 기능

---

**이 문서는 2026-07-31에 생성되었습니다.**
