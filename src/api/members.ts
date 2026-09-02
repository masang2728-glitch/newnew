import { supabase } from "../supabaseClient";
import type { TeamMember } from "../types";

function fromRow(row: any): TeamMember {
  return {
    team: row.team,
    name: row.name,
    orderNo: row.order_no,
    joinedAt: new Date(row.joined_at).getTime(),
  };
}

export async function upsertMember(team: string, name: string, orderNo: number) {
  const { error } = await supabase
    .from("team_members")
    .upsert({ team, name, order_no: orderNo }, { onConflict: "team,name" });
  if (error) throw error;
}

export async function deleteMember(team: string, name: string) {
  const { error } = await supabase.from("team_members").delete().eq("team", team).eq("name", name);
  if (error) throw error;
}

// 공장 관리자용 현황판: 특정 직장 목록의 팀원(총원)을 한 번에 가져온다.
export async function fetchMembersForTeams(teams: string[]): Promise<TeamMember[]> {
  if (teams.length === 0) return [];
  const { data, error } = await supabase.from("team_members").select("*").in("team", teams);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function fetchAllTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("team", { ascending: true })
    .order("order_no", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export function subscribeToMembers(
  team: string,
  onChange: (members: TeamMember[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team", team)
      .order("order_no", { ascending: true });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  // requests.ts와 동일한 이유로, 서버 필터 없이 테이블 전체 변경을 구독하고
  // 실제 팀 필터링은 load()의 .eq('team', team) 쿼리에서 처리한다.
  const channel = supabase
    .channel(`team_members-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
