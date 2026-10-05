"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | null;

export async function authenticate(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intent = formData.get("intent");

  if (!email || !password) {
    return { error: "Enter an email and a password." };
  }

  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) {
      return { message: "Check your email to confirm your account, then sign in." };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Picks a team, switches sides, or removes the pick if the same team is
// chosen again. The database enforces ownership, the kickoff lock and the odds.
export async function togglePick(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gameId = String(formData.get("gameId") ?? "");
  const team = String(formData.get("team") ?? "");
  if (!gameId || !team) return { error: "Missing game or team." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("picks")
    .select("id, picked_team")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .maybeSingle();

  const { error } =
    existing?.picked_team === team
      ? await supabase.from("picks").delete().eq("id", existing.id)
      : await supabase
          .from("picks")
          .upsert(
            { user_id: user.id, game_id: gameId, picked_team: team },
            { onConflict: "user_id,game_id" },
          );

  if (error) {
    // P0001 is a message raised by our own trigger, which is safe to show.
    // Anything else could expose database details, so keep it generic.
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Could not save your pick. Please try again.",
    };
  }

  revalidatePath("/");
  return null;
}
