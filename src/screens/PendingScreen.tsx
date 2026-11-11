import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { cancelRequest, setConfirmed, subscribeToRequests } from "../api/requests";
import { todayString } from "../dateUtils";
import type { RequestEntry, RequestType } from "../types";
import { BottomNav, JbScreen, ScreenTop } from "../components/JbLayout";

type Item = RequestEntry & { type: RequestType };

function kindOf(e: Item): string {
  return e.type === "vacation" ? `휴가 · ${e.leaveType ?? ""}` : `야근 · ${e.subType ?? ""}`;
}

// 메인 "직장 승인 대기" 칸을 누르면 나오는 화면.
// - 관리자: 기존 신청 화면과 같은 권한(승인/승인 취소/신청 취소, 수정은 기존 신청 화면에서)
// - 일반 직장원: 목록 보기만 (이름·날짜·종류. 행선지·사유는 보이지 않음)
export default function PendingScreen() {
  const { userName, teamName, isAdmin } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0); // 0 = 승인 대기, 1 = 승인 완료(오늘 이후)
  const [vacations, setVacations] = useState<RequestEntry[]>([]);
  const [overtimes, setOvertimes] = useState<RequestEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamName) return;
    const unsubVacation = subscribeToRequests(teamName, "vacation", setVacations);
    const unsubOvertime = subscribeToRequests(teamName, "overtime", setOvertimes);
    return () => {
      unsubVacation();
      unsubOvertime();
    };
  }, [teamName]);

  const today = todayString();
  const all = useMemo<Item[]>(
    () => [
      ...vacations.map((e) => ({ ...e, type: "vacation" as const })),
      ...overtimes.map((e) => ({ ...e, type: "overtime" as const })),
    ],
    [vacations, overtimes]
  );
  const waiting = useMemo(
    () => all.filter((e) => !e.confirmedAt).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [all]
  );
  const done = useMemo(
    () =>
      all
        .filter((e) => e.confirmedAt && e.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [all, today]
  );
  const list = isAdmin && tab === 1 ? done : waiting;

  const run = async (id: string, job: () => Promise<void>, ok: string) => {
    setBusyId(id);
    try {
      await job();
      toast.success(ok);
    } catch {
      toast.error("처리 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const approve = (e: Item, value: boolean) =>
    run(e.id, () => setConfirmed(e.type, e.id, value, userName ?? ""), value ? "승인했습니다." : "승인을 취소했습니다.");

  const cancel = (e: Item) => {
    if (!window.confirm(`${e.name}님의 ${e.date} ${kindOf(e)} 신청을 취소할까요?`)) return;
    run(e.id, () => cancelRequest(e.type, e.id), "신청을 취소했습니다.");
  };

  const edit = (e: Item) => {
    toast("아래 신청 내역에서 '수정'을 눌러 주세요.");
    navigate(e.type === "vacation" ? "/vacation" : "/overtime");
  };

  return (
    <JbScreen>
      <ScreenTop
        title="직장 승인 대기"
        tabs={isAdmin ? [`승인 대기 ${waiting.length}`, `승인 완료 ${done.length}`] : undefined}
        activeTab={tab}
        onTab={setTab}
      />
      <div className="jb-body">
        {!isAdmin && <p className="jb-note">우리 직장의 승인 대기 목록입니다. 승인은 관리자만 할 수 있어요.</p>}
        <section className="jb-box">
          {list.length === 0 ? (
            <p className="jb-empty">{tab === 1 && isAdmin ? "예정된 승인 완료 건이 없습니다." : "승인 대기 중인 신청이 없습니다."}</p>
          ) : (
            list.map((e) => (
              <div key={`${e.type}-${e.id}`} className="jb-row jb-pending-row">
                <span className={`jb-date ${e.type === "overtime" ? "ot" : ""}`}>
                  {e.date.slice(5).replace("-", ".")}
                </span>
                <div>
                  <b>{e.name}</b>
                  <small>
                    {kindOf(e)}
                    {isAdmin && e.startTime && e.endTime ? ` · ${e.startTime}~${e.endTime}` : ""}
                    {isAdmin && e.destination ? ` · ${e.destination}` : ""}
                    {isAdmin && e.reason ? ` · 사유: ${e.reason}` : ""}
                  </small>
                  {isAdmin && (
                    <div className="jb-actions">
                      {e.confirmedAt ? (
                        <button type="button" disabled={busyId === e.id} onClick={() => approve(e, false)}>
                          승인 취소
                        </button>
                      ) : (
                        <button type="button" className="primary" disabled={busyId === e.id} onClick={() => approve(e, true)}>
                          승인
                        </button>
                      )}
                      <button type="button" disabled={busyId === e.id} onClick={() => edit(e)}>
                        수정
                      </button>
                      <button type="button" className="danger" disabled={busyId === e.id} onClick={() => cancel(e)}>
                        신청 취소
                      </button>
                    </div>
                  )}
                </div>
                {!isAdmin && <em className={`jb-pill ${e.confirmedAt ? "green" : "amber"}`}>{e.confirmedAt ? "승인" : "대기"}</em>}
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </JbScreen>
  );
}
