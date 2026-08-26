import { supabase } from "../supabaseClient";
import type { RequestEntry, RequestType } from "../types";

function tableName(type: RequestType) {
  return type === "vacation" ? "vacation_requests" : "overtime_requests";
}

function fromRow(row: any): RequestEntry {
  return {
    id: row.id,
    team: row.team,
    name: row.name,
    date: row.date,
    createdAt: new Date(row.created_at).getTime(),
    leaveType: row.leave_type ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    destination: row.destination ?? undefined,
    reason: row.reason ?? undefined,
    subType: row.sub_type ?? undefined,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : undefined,
    confirmedBy: row.confirmed_by ?? undefined,
  };
}

export function subscribeToRequests(
  team: string,
  type: RequestType,
  onChange: (entries: RequestEntry[]) => void,
  onError?: (error: unknown) => void
) {
  const table = tableName(type);
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("team", team)
      .order("created_at", { ascending: true });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  // 팀명에 한글 등 non-ASCII 문자가 들어가면 Realtime의 filter 문자열이
  // 제대로 매칭되지 않는 경우가 있어, 서버 필터 없이 테이블 전체 변경을 구독하고
  // 실제 팀 필터링은 load()의 .eq('team', team) 쿼리에서 처리한다.
  const channel = supabase
    .channel(`${table}-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function createRequest(
  team: string,
  type: RequestType,
  name: string,
  date: string,
  extra?: Partial<
    Pick<RequestEntry, "leaveType" | "startTime" | "endTime" | "destination" | "reason" | "subType">
  >
) {
  const payload: Record<string, unknown> = { team, name, date };
  if (type === "vacation") {
    payload.leave_type = extra?.leaveType;
    if (extra?.startTime) payload.start_time = extra.startTime;
    if (extra?.endTime) payload.end_time = extra.endTime;
    if (extra?.destination) payload.destination = extra.destination;
    if (extra?.reason) payload.reason = extra.reason;
  } else {
    payload.sub_type = extra?.subType;
  }

  const { error } = await supabase.from(tableName(type)).insert(payload);
  if (error) throw error;
}

export async function cancelRequest(type: RequestType, id: string) {
  const { error } = await supabase.from(tableName(type)).delete().eq("id", id);
  if (error) throw error;
}

export async function setConfirmed(
  type: RequestType,
  id: string,
  confirmed: boolean,
  adminName: string
) {
  const payload = confirmed
    ? { confirmed_at: new Date().toISOString(), confirmed_by: adminName }
    : { confirmed_at: null, confirmed_by: null };
  const { error } = await supabase.from(tableName(type)).update(payload).eq("id", id);
  if (error) throw error;
}

// 최고관리자용 현황판: 팀 구분 없이 특정 날짜의 휴가 신청을 전부 가져온다.
export async function fetchVacationRequestsByDate(date: string): Promise<RequestEntry[]> {
  const { data, error } = await supabase.from("vacation_requests").select("*").eq("date", date);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export function subscribePendingCount(
  team: string,
  type: RequestType,
  onChange: (count: number) => void
) {
  const table = tableName(type);
  let cancelled = false;

  const load = async () => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("team", team)
      .is("confirmed_at", null);
    if (cancelled || error) return;
    onChange(count ?? 0);
  };

  load();

  const channel = supabase
    .channel(`${table}-pending-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
