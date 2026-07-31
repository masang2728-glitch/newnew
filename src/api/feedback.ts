import { supabase } from "../supabaseClient";

export interface FeedbackPost {
  id: string;
  name: string;
  team: string | null;
  content: string;
  createdAt: number;
}

function fromRow(row: any): FeedbackPost {
  return {
    id: row.id,
    name: row.name,
    team: row.team ?? null,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function subscribeToFeedback(
  onChange: (posts: FeedbackPost[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from("feedback_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  const channel = supabase
    .channel(`feedback_posts-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "feedback_posts" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function createFeedback(name: string, team: string | null, content: string) {
  const { error } = await supabase.from("feedback_posts").insert({ name, team, content });
  if (error) throw error;
}
