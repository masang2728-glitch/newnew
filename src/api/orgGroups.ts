import { supabase } from "../supabaseClient";

export interface OrgGroup {
  team: string;
  factory: string;
}

export async function fetchOrgGroups(): Promise<OrgGroup[]> {
  const { data, error } = await supabase
    .from("org_groups")
    .select("*")
    .order("factory", { ascending: true })
    .order("team", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ team: row.team, factory: row.factory }));
}

export async function setTeamFactory(team: string, factory: string) {
  const { error } = await supabase.from("org_groups").upsert({ team, factory }, { onConflict: "team" });
  if (error) throw error;
}

export async function fetchFactoryNames(): Promise<string[]> {
  const { data, error } = await supabase.from("org_groups").select("factory");
  if (error) throw error;
  const set = new Set<string>((data ?? []).map((row: any) => row.factory));
  return [...set].sort();
}
