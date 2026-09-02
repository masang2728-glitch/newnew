import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers } from "../api/members";
import { subscribeToIncidents, createIncident, deleteIncident } from "../api/incidents";
import type { TeamMember, IncidentRecord } from "../types";
import { INCIDENT_TYPES, type IncidentType } from "../constants";
import { todayString } from "../dateUtils";

const THEME_COLOR = "#0f766e";

export default function AccidentManagementScreen() {
  const { userName, teamName, isAdmin } = useSession();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [records, setRecords] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [selectedType, setSelectedType] = useState<IncidentType>(INCIDENT_TYPES[0]);
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(todayString());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamName) return;
    const unsubMembers = subscribeToMembers(teamName, setMembers, () => toast.error("팀원 명단을 불러오지 못했습니다."));
    const unsubIncidents = subscribeToIncidents(
      teamName,
      (list) => {
        setRecords(list);
        setLoading(false);
      },
      () => {
        toast.error("사고관리 기록을 불러오지 못했습니다.");
        setLoading(false);
      }
    );
    return () => {
      unsubMembers();
      unsubIncidents();
    };
  }, [teamName]);

  useEffect(() => {
    if (!targetName && members.length > 0) setTargetName(members[0].name);
  }, [members, targetName]);

  const today = todayString();
  const ongoing = useMemo(
    () => [...records].filter((r) => r.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [records, today]
  );
  const past = useMemo(
    () => [...records].filter((r) => r.endDate < today).sort((a, b) => b.endDate.localeCompare(a.endDate)),
    [records, today]
  );

  const openAddModal = () => {
    setSelectedType(INCIDENT_TYPES[0]);
    setStartDate(today);
    setEndDate(today);
    setNote("");
    setTargetName(members[0]?.name ?? "");
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!teamName) return;
    if (!targetName) {
      toast.error("대상자를 선택해주세요.");
      return;
    }
    if (startDate > endDate) {
      toast.error("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }
    setSubmitting(true);
    try {
      await createIncident(teamName, targetName, selectedType, startDate, endDate, note.trim() || undefined, userName ?? "");
      toast.success("사고 등록이 완료됐습니다.");
      setShowAddModal(false);
    } catch {
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: IncidentRecord) => {
    if (!window.confirm(`${record.name}님의 ${record.type} 기록을 삭제할까요?`)) return;
    setDeletingId(record.id);
    try {
      await deleteIncident(record.id);
      toast.success("삭제했습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderCard = (record: IncidentRecord, ongoingFlag: boolean) => (
    <div key={record.id} className={`status-card ${ongoingFlag ? "status-card-ongoing" : ""}`}>
      <div className="status-card-head">
        <span className="status-card-name">{record.name}</span>
        <span className="status-tag">{record.type}</span>
      </div>
      <div className="status-card-period">
        {record.startDate} ~ {record.endDate}
        {ongoingFlag && <span className="ongoing-badge"> · 진행중</span>}
      </div>
      {record.note && <div className="status-card-note">{record.note}</div>}
      {isAdmin && (
        <div className="status-card-actions">
          <button
            type="button"
            className="cancel-link"
            disabled={deletingId === record.id}
            onClick={() => handleDelete(record)}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: THEME_COLOR }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">사고관리</h1>
            <div className="request-user">{teamName} · 출장·교육·휴직·공로·파견</div>
          </div>
          <button type="button" className="request-back" onClick={() => navigate(-1)}>
            ‹ 대시보드로
          </button>
        </div>
      </div>

      <div className="content">
        {isAdmin && (
          <button type="button" className="submit-button" style={{ backgroundColor: THEME_COLOR }} onClick={openAddModal}>
            + 사고 등록
          </button>
        )}

        {loading ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            불러오는 중...
          </p>
        ) : (
          <>
            <div className="section-title">진행중</div>
            {ongoing.length === 0 ? (
              <p className="empty-text">진행중인 기록이 없습니다.</p>
            ) : (
              ongoing.map((r) => renderCard(r, true))
            )}

            <div className="section-title">지난 기록</div>
            {past.length === 0 ? (
              <p className="empty-text">지난 기록이 없습니다.</p>
            ) : (
              past.map((r) => renderCard(r, false))
            )}

            <div className="note-box">
              <b>안내</b> · 여기 등록한 인원은 달력에는 표시되지 않고, 등록한 기간 동안 매일 대시보드 표의
              사고내용(출장/교육/휴직/공로/파견) 열에 자동으로 집계됩니다.
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">사고 등록</div>

            <div className="field-label" style={{ marginTop: 0 }}>
              대상자
            </div>
            <select className="text-field" value={targetName} onChange={(e) => setTargetName(e.target.value)}>
              {members.length === 0 && <option value="">팀원이 없습니다</option>}
              {members.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="field-label">유형</div>
            <div className="chip-row">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="option-chip"
                  style={
                    selectedType === t
                      ? { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR, color: "#fff" }
                      : undefined
                  }
                  onClick={() => setSelectedType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="field-label">기간</div>
            <div className="date-row">
              <input
                className="text-field"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span>~</span>
              <input className="text-field" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="field-label">비고 (선택)</div>
            <input
              className="text-field"
              placeholder="예: 육아휴직, 승진 축하 공로 등"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              type="button"
              className="submit-button"
              style={{ backgroundColor: THEME_COLOR }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              등록
            </button>
            <button type="button" className="modal-cancel" onClick={() => setShowAddModal(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
