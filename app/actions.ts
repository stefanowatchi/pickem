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
    return { error: friendlyError(error, "Could not save your pick. Please try again.") };
  }

  revalidatePath("/");
  return null;
}

// P0001 is a message raised by our own database functions, which is safe to
// show. Anything else could expose database details, so it stays generic.
function friendlyError(
  error: { code?: string; message: string },
  fallback: string,
) {
  return error.code === "P0001" ? error.message : fallback;
}

export async function saveDisplayName(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 24) {
    return { error: "Names must be 2 to 24 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That name is taken. Try another."
          : "Could not save your name. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function createGroup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { error: "Group names must be 2 to 40 characters." };
  }

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("create_group", {
    group_name: name,
  });
  if (error) {
    return { error: friendlyError(error, "Could not create the group. Please try again.") };
  }

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function joinGroup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return { error: "Codes are 6 letters and numbers." };
  }

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("join_group", {
    group_code: code,
  });
  if (error) {
    return { error: friendlyError(error, "Could not join the group. Please try again.") };
  }

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  revalidatePath("/groups");
  redirect("/groups");
}
