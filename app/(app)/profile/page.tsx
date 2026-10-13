import Link from "next/link";
import { redirect } from "next/navigation";
import { NameForm } from "@/app/group-forms";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/welcome");

  return (
    <main className="py-6">
      <h2 className="display text-3xl">Your profile</h2>
      <p className="mt-2 text-sm text-muted">
        Your display name is what other players see on leaderboards and in
        groups.
      </p>

      <NameForm currentName={profile.display_name} />

      <section className="card mt-4 p-5">
        <p className="label">Email</p>
        <p className="mt-1.5 truncate font-mono text-sm">{user.email}</p>
        <p className="mt-2 text-xs text-muted">
          Only you can see this. It is never shown to other players.
        </p>
      </section>

      <Link
        href={`/players/${user.id}`}
        className="mt-6 inline-block text-sm font-semibold text-accent hover:underline"
      >
        See your picks and points →
      </Link>
    </main>
  );
}
