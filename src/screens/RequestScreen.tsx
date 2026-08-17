import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import type { RequestEntry, RequestType, TeamMember } from "../types";
import { subscribeToRequests, createRequest, cancelRequest, setConfirmed } from "../api/requests";
import { subscribeToMembers } from "../api/members";
import { isPastDate, todayString } from "../dateUtils";
import MonthCalendar from "../components/MonthCalendar";
import TimeRangeSlider from "../components/TimeRangeSlider";
import {
  VACATION_CATEGORIES,
  type VacationCategory,
  LEAVE_SUBTYPES,
  WORK_REST_SUBTYPES,
  type VacationType,
  OVERTIME_SUBTYPES,
  type OvertimeSubType,
  HALF_DAY_PRESETS,
  REASON_REQUIRED_TYPES,
} from "../constants";

interface Props {
  type: RequestType;
  title: string; // "휴가" | "야근"
  themeColor: string;
}

type Tab = "apply" | "calendar";
type OvertimeChoice = OvertimeSubType | "둘다";

interface OvertimeGroups {
  both: string[];
  earlyOnly: string[];
  lateOnly: string[];
}

function groupOvertimeByPerson(dayEntries: RequestEntry[]): OvertimeGroups {
  const byName = new Map<string, Set<OvertimeSubType>>();
  for (const e of dayEntries) {
    if (!e.subType) continue;
    if (!byName.has(e.name)) byName.set(e.name, new Set());
    byName.get(e.name)!.add(e.subType);
  }
  const groups: OvertimeGroups = { both: [], earlyOnly: [], lateOnly: [] };
  for (const [name, subTypes] of byName) {
    const hasEarly = subTypes.has("조출");
    const hasLate = subTypes.has("야근");
    if (hasEarly && hasLate) groups.both.push(name);
    else if (hasEarly) groups.earlyOnly.push(name);
    else if (hasLate) groups.lateOnly.push(name);
  }
  return groups;
}

const OVERTIME_GROUP_ORDER: { key: keyof OvertimeGroups; emoji: string; label: string }[] = [
  { key: "both", emoji: "🔶", label: "조출 + 야근 둘 다" },
  { key: "earlyOnly", emoji: "🌅", label: "조출만" },
  { key: "lateOnly", emoji: "🌙", label: "야근만" },
];

function entryLabel(entry: RequestEntry): string {
  if (entry.subType) return `${entry.name} (${entry.subType})`;
  if (entry.leaveType) {
    const timeRange = entry.startTime && entry.endTime ? `, ${entry.startTime}~${entry.endTime}` : "";
    const dest = entry.destination ? `, ${entry.destination}` : "";
    const reasonText = entry.reason ? `, 사유: ${entry.reason}` : "";
    return `${entry.name} (${entry.leaveType}${timeRange}${dest}${reasonText})`;
  }
  return entry.name;
}

export default function RequestScreen({ type, title, themeColor }: Props) {
  const { userName, teamName, isAdmin } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("apply");
  const [entries, setEntries] = useState<RequestEntry[]>([]);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyMonth, setApplyMonth] = useState<string>(todayString().slice(0, 7));
  const [viewMonth, setViewMonth] = useState<string>(todayString().slice(0, 7));

  // 관리자가 팀원을 대신해 신청할 때 쓰는 대상자 선택
  const [applicantName, setApplicantName] = useState(userName ?? "");
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const applicant = isAdmin ? applicantName : (userName ?? "");

  useEffect(() => {
    if (!teamName) return;
    const unsubscribe = subscribeToMembers(teamName, setTeamRoster);
    return unsubscribe;
  }, [teamName]);

  // 순번 오름차순 정렬에 쓰는 이름→순번 조회표
  const orderByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of teamRoster) map.set(m.name, m.orderNo);
    return map;
  }, [teamRoster]);
  const byOrderAsc = (nameA: string, nameB: string) =>
    (orderByName.get(nameA) ?? Infinity) - (orderByName.get(nameB) ?? Infinity);

  // 휴가 전용 상태
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [vacationType, setVacationType] = useState<VacationType | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [categoryPicker, setCategoryPicker] = useState<VacationCategory | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const halfDayPreset = vacationType ? HALF_DAY_PRESETS[vacationType] : undefined;
  const reasonRequired = vacationType ? REASON_REQUIRED_TYPES.includes(vacationType) : false;

  const selectedCategory: VacationCategory | null = !vacationType
    ? null
    : (LEAVE_SUBTYPES as readonly string[]).includes(vacationType)
      ? "연가"
      : (WORK_REST_SUBTYPES as readonly string[]).includes(vacationType)
        ? "근무휴식"
        : (vacationType as VacationCategory);

  const selectVacationType = (vt: VacationType) => {
    setVacationType(vt);
    const preset = HALF_DAY_PRESETS[vt];
    if (preset) {
      setStartTime(preset.start);
      setEndTime(preset.end);
    } else {
      setStartTime("");
      setEndTime("");
    }
  };

  const openCategoryPicker = (category: VacationCategory) => {
    if (category === "공가" || category === "청원" || category === "기타") setReasonDraft(reason);
    setCategoryPicker(category);
  };

  const chooseSubType = (subType: VacationType) => {
    selectVacationType(subType);
    setCategoryPicker(null);
  };

  const confirmReasonCategory = () => {
    if (!categoryPicker || categoryPicker === "연가" || categoryPicker === "근무휴식") return;
    if (!reasonDraft.trim()) {
      toast.error("사유를 입력해주세요.");
      return;
    }
    selectVacationType(categoryPicker);
    setReason(reasonDraft.trim());
    setCategoryPicker(null);
  };

  // 야근 전용 상태
  const [overtimeSelections, setOvertimeSelections] = useState<Record<string, OvertimeChoice>>({});
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  useEffect(() => {
    if (!teamName) return;
    const unsubscribe = subscribeToRequests(teamName, type, setEntries, () =>
      toast.error("데이터를 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, [teamName, type]);

  const visibleEntries = useMemo(
    () =>
      isAdmin
        ? entries.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
        : entries.filter((e) => e.name === userName).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, userName, isAdmin]
  );

  const entriesByDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of Object.keys(entriesByDate)) {
      map[d] =
        type === "overtime"
          ? new Set(entriesByDate[d].map((e) => e.name)).size
          : entriesByDate[d].length;
    }
    return map;
  }, [entriesByDate, type]);

  const overtimeSplitCountByDate = useMemo(() => {
    if (type !== "overtime") return undefined;
    const map: Record<string, { early: number; late: number }> = {};
    for (const d of Object.keys(entriesByDate)) {
      const dayEntries = entriesByDate[d];
      const early = new Set(dayEntries.filter((e) => e.subType === "조출").map((e) => e.name)).size;
      const late = new Set(dayEntries.filter((e) => e.subType === "야근").map((e) => e.name)).size;
      map[d] = { early, late };
    }
    return map;
  }, [entriesByDate, type]);

  const overtimeGroupsForViewingDate = useMemo(() => {
    if (type !== "overtime" || !viewingDate) return null;
    const groups = groupOvertimeByPerson(entriesByDate[viewingDate] ?? []);
    groups.both.sort(byOrderAsc);
    groups.earlyOnly.sort(byOrderAsc);
    groups.lateOnly.sort(byOrderAsc);
    return groups;
  }, [type, viewingDate, entriesByDate, orderByName]);

  const applySelectedSet = useMemo(
    () => (type === "vacation" ? selectedDates : new Set(Object.keys(overtimeSelections))),
    [type, selectedDates, overtimeSelections]
  );

  const monthlyEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(viewMonth)),
    [entries, viewMonth]
  );
  const monthlyHeadcount = useMemo(
    () => new Set(monthlyEntries.map((e) => e.name)).size,
    [monthlyEntries]
  );
  const monthLabel = useMemo(() => {
    const [y, m] = viewMonth.split("-");
    return `${y}년 ${Number(m)}월`;
  }, [viewMonth]);

  // "날짜__유형" 단위로 중복을 판단해서, 같은 날짜라도 유형이 다르면(예: 오전 외출 + 오후 공가) 신청할 수 있게 한다.
  const myTakenKeys = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.name !== applicant) continue;
      const t = type === "vacation" ? e.leaveType : e.subType;
      if (t) set.add(`${e.date}__${t}`);
    }
    return set;
  }, [entries, applicant, type]);

  const handleDayClick = (dateString: string) => {
    if (isPastDate(dateString)) {
      toast.error("지난 날짜는 신청할 수 없습니다.");
      return;
    }
    if (type === "vacation") {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateString)) next.delete(dateString);
        else next.add(dateString);
        return next;
      });
    } else {
      setPickerDate(dateString);
    }
  };

  const chooseOvertime = (choice: OvertimeChoice) => {
    if (!pickerDate) return;
    setOvertimeSelections((prev) => ({ ...prev, [pickerDate]: choice }));
    setPickerDate(null);
  };

  const removeOvertimeDate = () => {
    if (!pickerDate) return;
    setOvertimeSelections((prev) => {
      const next = { ...prev };
      delete next[pickerDate];
      return next;
    });
    setPickerDate(null);
  };

  const validateTime = (): boolean => {
    if (startTime && endTime && startTime >= endTime) {
      toast.error("종료시간은 시작시간보다 늦어야 합니다.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!applicant || !teamName) return;

    if (type === "vacation") {
      if (selectedDates.size === 0) {
        toast.error("날짜를 하나 이상 선택해주세요.");
        return;
      }
      if (!vacationType) {
        toast.error("휴가 유형을 선택해주세요.");
        return;
      }
      if (!validateTime()) return;
      if (reasonRequired && !reason.trim()) {
        toast.error(`${vacationType} 사유를 입력해주세요.`);
        return;
      }
      const duplicates = [...selectedDates].filter((d) => myTakenKeys.has(`${d}__${vacationType}`));
      if (duplicates.length > 0) {
        toast.error(`이미 같은 유형(${vacationType})으로 신청한 날짜가 포함되어 있습니다. (${duplicates.join(", ")})`);
        return;
      }

      setSubmitting(true);
      try {
        for (const date of selectedDates) {
          await createRequest(teamName, "vacation", applicant, date, {
            leaveType: vacationType,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            destination: destination.trim() || undefined,
            reason: reason.trim() || undefined,
          });
        }
        toast.success(
          isAdmin && applicant !== userName ? `${applicant}님 휴가 신청이 완료되었습니다.` : "휴가 신청이 완료되었습니다."
        );
        setSelectedDates(new Set());
        setVacationType(null);
        setStartTime("");
        setEndTime("");
        setDestination("");
        setReason("");
      } catch {
        toast.error("신청 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
    } else {
      const dates = Object.keys(overtimeSelections);
      if (dates.length === 0) {
        toast.error("날짜를 하나 이상 선택해주세요.");
        return;
      }
      const subTypesByDate = new Map<string, OvertimeSubType[]>();
      for (const d of dates) {
        const choice = overtimeSelections[d];
        subTypesByDate.set(d, choice === "둘다" ? ["조출", "야근"] : [choice]);
      }
      const duplicates: string[] = [];
      for (const [d, subTypes] of subTypesByDate) {
        for (const st of subTypes) {
          if (myTakenKeys.has(`${d}__${st}`)) duplicates.push(`${d}(${st})`);
        }
      }
      if (duplicates.length > 0) {
        toast.error(`이미 같은 유형으로 신청한 날짜가 포함되어 있습니다. (${duplicates.join(", ")})`);
        return;
      }

      setSubmitting(true);
      try {
        for (const [date, subTypes] of subTypesByDate) {
          for (const subType of subTypes) {
            await createRequest(teamName, "overtime", applicant, date, { subType });
          }
        }
        toast.success(
          isAdmin && applicant !== userName ? `${applicant}님 야근 신청이 완료되었습니다.` : "야근 신청이 완료되었습니다."
        );
        setOvertimeSelections({});
      } catch {
        toast.error("신청 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleToggleConfirm = async (entry: RequestEntry) => {
    if (!isAdmin || !userName) return;
    try {
      await setConfirmed(type, entry.id, !entry.confirmedAt, userName);
    } catch {
      toast.error("확인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleCancel = async (entry: RequestEntry) => {
    const allowed = entry.name === userName || isAdmin;
    if (!allowed) return;
    const label = isAdmin && entry.name !== userName ? `${entry.name}님의 ` : "";
    if (!window.confirm(`${label}${entry.date} 신청을 취소할까요?`)) return;
    try {
      await cancelRequest(type, entry.id);
      toast.success("취소되었습니다.");
    } catch {
      toast.error("취소 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: themeColor }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{title} 신청</h1>
            <div className="request-user">
              {teamName} · {userName}님으로 접속 중{isAdmin ? " · 관리자" : ""}
            </div>
          </div>
          <button type="button" className="request-back" onClick={() => navigate("/main")}>
            메인으로 돌아가기 ›
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className="tab-button"
          style={tab === "apply" ? { borderBottomColor: themeColor, color: themeColor } : undefined}
          onClick={() => setTab("apply")}
        >
          신청하기
        </button>
        <button
          type="button"
          className="tab-button"
          style={tab === "calendar" ? { borderBottomColor: themeColor, color: themeColor } : undefined}
          onClick={() => setTab("calendar")}
        >
          캘린더 보기
        </button>
      </div>

      <div className="content">
        {tab === "apply" ? (
          <>
            {isAdmin && (
              <>
                <div className="field-label">신청 대상</div>
                <select
                  className="text-field"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                >
                  {teamRoster.length === 0 && userName && <option value={userName}>{userName}</option>}
                  {teamRoster.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                      {m.name === userName ? " (본인)" : ""}
                    </option>
                  ))}
                </select>
              </>
            )}

            <MonthCalendar
              month={applyMonth}
              onMonthChange={setApplyMonth}
              minDate={todayString()}
              selectedDates={applySelectedSet}
              onDayClick={handleDayClick}
              themeColor={themeColor}
            />

            {type === "vacation" ? (
              <>
                {selectedDates.size > 0 && (
                  <div className="chip-row">
                    {[...selectedDates].sort().map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="chip"
                        style={{ backgroundColor: themeColor }}
                        onClick={() =>
                          setSelectedDates((prev) => {
                            const next = new Set(prev);
                            next.delete(d);
                            return next;
                          })
                        }
                      >
                        {d} ✕
                      </button>
                    ))}
                  </div>
                )}

                <div className="field-label">휴가 유형</div>
                <div className="chip-row">
                  {VACATION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="option-chip"
                      style={
                        selectedCategory === cat
                          ? { backgroundColor: themeColor, borderColor: themeColor, color: "#fff" }
                          : undefined
                      }
                      onClick={() => openCategoryPicker(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {vacationType && (
                  <div className="auto-time-box">
                    <span>
                      {vacationType} 선택됨
                      {halfDayPreset ? ` · ${halfDayPreset.start} ~ ${halfDayPreset.end}` : ""}
                      {reason ? ` · 사유: ${reason}` : ""}
                    </span>
                    <button
                      type="button"
                      className="inline-edit-link"
                      onClick={() => selectedCategory && openCategoryPicker(selectedCategory)}
                    >
                      수정
                    </button>
                  </div>
                )}

                {vacationType && !halfDayPreset && (
                  <>
                    <div className="field-label">시작~종료시간 (선택)</div>
                    <TimeRangeSlider
                      startTime={startTime}
                      endTime={endTime}
                      onChange={(s, e) => {
                        setStartTime(s);
                        setEndTime(e);
                      }}
                      themeColor={themeColor}
                    />
                  </>
                )}

                <div className="field-label">행선지</div>
                <input
                  className="text-field"
                  placeholder="예: 부산 출장, 자택 등"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </>
            ) : (
              Object.keys(overtimeSelections).length > 0 && (
                <div className="chip-row">
                  {Object.keys(overtimeSelections)
                    .sort()
                    .map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="chip"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => setPickerDate(d)}
                      >
                        {d} ({overtimeSelections[d]})
                      </button>
                    ))}
                </div>
              )
            )}

            <button
              type="button"
              className="submit-button"
              style={{ backgroundColor: themeColor, opacity: submitting ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              신청 확인
            </button>

            <div className="section-title">
              {isAdmin ? `전체 ${title} 신청 내역 관리` : `나의 ${title} 신청 내역`}
            </div>
            {visibleEntries.length === 0 ? (
              <p className="empty-text">신청 내역이 없습니다.</p>
            ) : (
              visibleEntries.map((e) => (
                <div key={e.id} className="entry-row">
                  <span className="entry-row-text">
                    {entryLabel(e)} · {e.date}
                  </span>
                  <div className="entry-row-actions">
                    {isAdmin ? (
                      <button
                        type="button"
                        className={`confirm-button ${e.confirmedAt ? "confirm-button-done" : "confirm-button-pending"}`}
                        onClick={() => handleToggleConfirm(e)}
                      >
                        {e.confirmedAt ? "✓ 확인됨" : "확인"}
                      </button>
                    ) : (
                      <span
                        className={`confirm-badge ${e.confirmedAt ? "confirm-badge-done" : "confirm-badge-pending"}`}
                      >
                        {e.confirmedAt ? "✓ 관리자 확인 완료" : "확인 대기중"}
                      </span>
                    )}
                    <button type="button" className="cancel-link" onClick={() => handleCancel(e)}>
                      취소
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <div className="summary-bar" style={{ borderColor: themeColor }}>
              <span className="summary-label">{monthLabel} 신청 현황</span>
              <span className="summary-value" style={{ color: themeColor }}>
                총 {monthlyEntries.length}건 · {monthlyHeadcount}명
              </span>
            </div>
            {type === "overtime" && (
              <div className="calendar-legend">
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-split-early" /> 조출 인원
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-split-late" /> 야근 인원
                </span>
              </div>
            )}
            <MonthCalendar
              month={viewMonth}
              onMonthChange={setViewMonth}
              singleSelectedDate={viewingDate}
              countByDate={countByDate}
              splitCountByDate={overtimeSplitCountByDate}
              onDayClick={setViewingDate}
              themeColor={themeColor}
            />
            <div className="section-title">
              {viewingDate ? `${viewingDate} 신청자` : "날짜를 선택해주세요"}
            </div>
            {viewingDate && overtimeGroupsForViewingDate ? (
              overtimeGroupsForViewingDate.both.length +
                overtimeGroupsForViewingDate.earlyOnly.length +
                overtimeGroupsForViewingDate.lateOnly.length ===
              0 ? (
                <p className="empty-text">신청자가 없습니다.</p>
              ) : (
                <div className="overtime-groups">
                  {OVERTIME_GROUP_ORDER.map(({ key, emoji, label }) => {
                    const names = overtimeGroupsForViewingDate[key];
                    return (
                      <div key={key} className="overtime-group">
                        <div className="overtime-group-head">
                          <span className="overtime-group-title">
                            {emoji} {label}
                          </span>
                          <span className="overtime-group-count">{names.length}명</span>
                        </div>
                        {names.length === 0 ? (
                          <p className="overtime-group-empty">없음</p>
                        ) : (
                          <div className="chip-row">
                            {names.map((n) => (
                              <span key={n} className="name-chip">
                                {n}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              viewingDate &&
              (entriesByDate[viewingDate]?.length ? (
                entriesByDate[viewingDate]
                  .slice()
                  .sort((a, b) => byOrderAsc(a.name, b.name))
                  .map((e) => (
                    <p key={e.id} className="viewer-name">
                      • {entryLabel(e)}
                    </p>
                  ))
              ) : (
                <p className="empty-text">신청자가 없습니다.</p>
              ))
            )}

            {type === "vacation" && (
              <>
                <div className="section-title">{monthLabel} 휴가 명단</div>
                {monthlyEntries.length === 0 ? (
                  <p className="empty-text">이번 달 신청 내역이 없습니다.</p>
                ) : (
                  monthlyEntries
                    .slice()
                    .sort((a, b) => byOrderAsc(a.name, b.name))
                    .map((e) => (
                      <div key={e.id} className="agg-row">
                        <div className="agg-row-top">
                          <span className="agg-name">{e.name}</span>
                          <span className="agg-date">{e.date}</span>
                        </div>
                        <div className="agg-detail">
                          {e.leaveType}
                          {e.startTime && e.endTime ? ` · ${e.startTime}~${e.endTime}` : ""}
                          {e.destination ? ` · ${e.destination}` : ""}
                          {e.reason ? ` · 사유: ${e.reason}` : ""}
                          {" · "}
                          <span
                            className={`confirm-badge ${e.confirmedAt ? "confirm-badge-done" : "confirm-badge-pending"}`}
                          >
                            {e.confirmedAt ? "✓ 확인" : "대기"}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </>
            )}
          </>
        )}
      </div>

      {pickerDate && (
        <div className="modal-backdrop" onClick={() => setPickerDate(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{pickerDate} 야근 유형 선택</div>
            {OVERTIME_SUBTYPES.map((st) => (
              <button
                key={st}
                type="button"
                className="modal-option"
                style={{ borderColor: themeColor, color: themeColor }}
                onClick={() => chooseOvertime(st)}
              >
                {st}
              </button>
            ))}
            <button
              type="button"
              className="modal-option"
              style={{ backgroundColor: themeColor, borderColor: themeColor, color: "#fff" }}
              onClick={() => chooseOvertime("둘다")}
            >
              조출 + 야근 둘 다
            </button>
            {overtimeSelections[pickerDate] && (
              <button type="button" className="modal-remove" onClick={removeOvertimeDate}>
                이 날짜 선택 해제
              </button>
            )}
            <button type="button" className="modal-cancel" onClick={() => setPickerDate(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {categoryPicker && (
        <div className="modal-backdrop" onClick={() => setCategoryPicker(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {categoryPicker === "연가" || categoryPicker === "근무휴식" ? (
              <>
                <div className="modal-title">{categoryPicker} 세부 유형 선택</div>
                {(categoryPicker === "연가" ? LEAVE_SUBTYPES : WORK_REST_SUBTYPES).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="modal-option"
                    style={{ borderColor: themeColor, color: themeColor }}
                    onClick={() => chooseSubType(st)}
                  >
                    {st}
                  </button>
                ))}
                <button type="button" className="modal-cancel" onClick={() => setCategoryPicker(null)}>
                  닫기
                </button>
              </>
            ) : (
              <>
                <div className="modal-title">{categoryPicker} 사유 입력</div>
                <input
                  className="text-field"
                  placeholder={`${categoryPicker} 사유를 입력해주세요`}
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="modal-option"
                  style={{
                    backgroundColor: themeColor,
                    borderColor: themeColor,
                    color: "#fff",
                    marginTop: 12,
                  }}
                  onClick={confirmReasonCategory}
                >
                  확인
                </button>
                <button type="button" className="modal-cancel" onClick={() => setCategoryPicker(null)}>
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
