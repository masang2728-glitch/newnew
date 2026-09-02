import { supabase } from "../supabaseClient";
import type { IncidentRecord } from "../types";
import type { IncidentType } from "../constants";

function fromRow(row: any): IncidentRecord {
  return {
    id: row.id,
    team: row.team,
    name: row.name,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    createdBy: row.created_by ?? undefined,
  };
}

export async function createIncident(
  team: string,
  name: string,
  type: IncidentType,
  startDate: string,
  endDate: string,
  note: string | undefined,
  createdBy: string
) {
  const payload: Record<string, unknown> = {
    team,
    name,
    type,
    start_date: startDate,
    end_date: endDate,
    created_by: createdBy,
  };
  if (note) payload.note = note;
  const { error } = await supabase.from("incident_records").insert(payload);
  if (error) throw error;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from("incident_records").delete().eq("id", id);
  if (error) throw error;
}

// 사고관리 화면(직장 관리자용): 우리 직장의 기록을 실시간으로 구독한다.
export function subscribeToIncidents(
  team: string,
  onChange: (records: IncidentRecord[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from("incident_records")
      .select("*")
      .eq("team", team)
      .order("start_date", { ascending: false });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  // requests.ts / members.ts와 동일한 이유로, 서버 필터 없이 테이블 전체 변경을 구독하고
  // 실제 팀 필터링은 load()의 .eq('team', team) 쿼리에서 처리한다.
  const channel = supabase
    .channel(`incident_records-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "incident_records" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// 공장/직장 대시보드용 현황판: 여러 직장의 기록을 한 번에 가져온다 (새로고침 기반).
export async function fetchIncidentsForTeams(teams: string[]): Promise<IncidentRecord[]> {
  if (teams.length === 0) return [];
  const { data, error } = await supabase.from("incident_records").select("*").in("team", teams);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}
