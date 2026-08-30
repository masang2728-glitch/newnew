import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchOrgGroups } from "../api/orgGroups";
import { fetchRequestsForTeams } from "../api/requests";
import type { RequestEntry } from "../types";
import { todayString } from "../dateUtils";
import { LEAVE_SUBTYPES } from "../constants";

const THEME_COLOR = "#0f766e";

// 사진 속 사고현황표의 "휴가/청원휴가/병가/공가" 4개 열에 맞춘 집계.
// "휴가" 열 = 이 앱의 "연가" 대분류(1일 휴가/오전반차/오후반차/외출 세부유형 전부 포함).
type LeaveBucket = "연가" | "청원" | "병가" | "공가";
const LEAVE_BUCKETS: LeaveBucket[] = ["연가", "청원", "병가", "공가"];
const LEAVE_BUCKET_LABEL: Record<LeaveBucket, string> = { 연가: "휴가", 청원: "청원", 병가: "병가", 공가: "공가" };
const LEAVE_SUBTYPE_SET = new Set<string>(LEAVE_SUBTYPES);

function emptyBucketCounts(): Record<LeaveBucket, number> {
  return { 연가: 0, 청원: 0, 병가: 0, 공가: 0 };
}

function bucketOf(entry: RequestEntry): LeaveBucket | null {
  const t = entry.leaveType;
  if (!t) return null;
  if (LEAVE_SUBTYPE_SET.has(t)) return "연가";
  if (t === "청원" || t === "병가" || t === "공가") return t;
  return null; // 근무휴식/기타는 이 표에서는 제외 (사진 속 표에 없는 유형)
}

export default function FactoryDashboardScreen() {
  const { factoryName, logout } = useSession();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<string[]>([]);
  const [vacationEntries, setVacationEntries] = useState<RequestEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<RequestEntry[]>([]);
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!factoryName) return;
    setLoading(true);
    try {
      const groups = await fetchOrgGroups();
      const myTeams = groups.filter((g) => g.factory === factoryName).map((g) => g.team);
      setTeams(myTeams);
      const [vac, ot] = await Promise.all([
        fetchRequestsForTeams("vacation", myTeams),
        fetchRequestsForTeams("overtime", myTeams),
      ]);
      setVacationEntries(vac);
      setOvertimeEntries(ot);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [factoryName]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-");
    return `${y}년 ${Number(m)}월`;
  }, [month]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthlyVacation = useMemo(
    () => vacationEntries.filter((e) => e.date.startsWith(month) && e.confirmedAt),
    [vacationEntries, month]
  );
  const monthlyOvertime = useMemo(
    () => overtimeEntries.filter((e) => e.date.startsWith(month)),
    [overtimeEntries, month]
  );

  const byTeam = useMemo(() => {
    const map: Record<
      string,
      { vacation: RequestEntry[]; overtime: RequestEntry[]; counts: Record<LeaveBucket, number> }
    > = {};
    for (const t of teams) map[t] = { vacation: [], overtime: [], counts: emptyBucketCounts() };
    for (const e of monthlyVacation) {
      if (!map[e.team]) map[e.team] = { vacation: [], overtime: [], counts: emptyBucketCounts() };
      map[e.team].vacation.push(e);
      const bucket = bucketOf(e);
      if (bucket) map[e.team].counts[bucket] += 1;
    }
    for (const e of monthlyOvertime) {
      if (!map[e.team]) map[e.team] = { vacation: [], overtime: [], counts: emptyBucketCounts() };
      map[e.team].overtime.push(e);
    }
    return map;
  }, [teams, monthlyVacation, monthlyOvertime]);

  const factoryTotals = useMemo(() => {
    const totals = emptyBucketCounts();
    for (const team of teams) {
      const c = byTeam[team]?.counts;
      if (!c) continue;
      for (const b of LEAVE_BUCKETS) totals[b] += c[b];
    }
    return totals;
  }, [teams, byTeam]);

  const handleExit = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: THEME_COLOR }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{factoryName} 현황 대시보드</h1>
            <div className="request-user">소속 직장 {teams.length}곳</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            나가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="calendar-header">
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <div className="calendar-title">{monthLabel}</div>
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">
            ›
          </button>
        </div>

        <div className="section-title-row">
          <div className="section-title" style={{ margin: 0 }}>
            전체 요약
          </div>
          <button type="button" className="refresh-link" onClick={load}>
            새로고침
          </button>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat-card">
            <div className="stat-value">{monthlyVacation.length}</div>
            <div className="stat-label">휴가 신청 (확인완료)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{monthlyOvertime.length}</div>
            <div className="stat-label">야근 신청</div>
          </div>
        </div>

        <div className="section-title">유형별 집계</div>
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {LEAVE_BUCKETS.map((b) => (
            <div key={b} className="stat-card">
              <div className="stat-value">{factoryTotals[b]}</div>
              <div className="stat-label">{LEAVE_BUCKET_LABEL[b]}</div>
            </div>
          ))}
        </div>

        <div className="section-title">직장별 유형별 집계</div>
        {loading ? (
          <p className="empty-text">불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p className="empty-text">이 공장에 배정된 직장이 없습니다.</p>
        ) : (
          <div className="leave-table">
            <div className="lt-row lt-head">
              <div className="lt-cell lt-cell-label">직장</div>
              {LEAVE_BUCKETS.map((b) => (
                <div key={b} className="lt-cell">
                  {LEAVE_BUCKET_LABEL[b]}
                </div>
              ))}
              <div className="lt-cell">합계</div>
            </div>
            <div className="lt-row lt-total-row">
              <div className="lt-cell-label">총계</div>
              {LEAVE_BUCKETS.map((b) => (
                <div key={b} className="lt-cell">
                  {factoryTotals[b]}
                </div>
              ))}
              <div className="lt-cell">
                {LEAVE_BUCKETS.reduce((sum, b) => sum + factoryTotals[b], 0)}
              </div>
            </div>
            {teams.map((team) => {
              const counts = byTeam[team]?.counts ?? emptyBucketCounts();
              const total = LEAVE_BUCKETS.reduce((sum, b) => sum + counts[b], 0);
              return (
                <div key={team} className="lt-row">
                  <div className="lt-cell-label">{team}</div>
                  {LEAVE_BUCKETS.map((b) => (
                    <div key={b} className="lt-cell">
                      {counts[b]}
                    </div>
                  ))}
                  <div className="lt-cell">{total}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="section-title">직장별 상세</div>
        {loading ? (
          <p className="empty-text">불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p className="empty-text">
            이 공장에 배정된 직장이 없습니다. 최고관리자에게 소속 등록을 요청해주세요.
          </p>
        ) : (
          teams.map((team) => {
            const data = byTeam[team] ?? { vacation: [], overtime: [], counts: emptyBucketCounts() };
            return (
              <div key={team} className="team-row-block">
                <div className="team-row">
                  <div className="team-row-main">
                    <div className="team-row-name">{team}</div>
                    <div className="team-row-meta">
                      휴가 {data.vacation.length}건 · 야근 {data.overtime.length}건
                    </div>
                  </div>
                </div>
                {data.vacation.length > 0 && (
                  <div className="chip-row">
                    {data.vacation.map((e) => (
                      <span key={e.id} className="name-chip">
                        {e.name} · {e.date} · {e.leaveType}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
