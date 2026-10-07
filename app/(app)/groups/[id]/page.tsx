import Link from "next/link";
import { notFound } from "next/navigation";
import { leaveGroup } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Database rules return nothing here unless the signed-in user is a member.
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, code")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", id)
    .order("joined_at");

  const memberIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", memberIds);
  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  return (
    <main className="py-6">
      <Link href="/groups" className="text-sm text-foreground/60 hover:text-foreground">
        ← All groups
      </Link>
      <h2 className="mt-2 text-lg font-semibold">{group.name}</h2>

      <section className="mt-4 rounded-lg border border-foreground/10 p-4">
        <h3 className="text-sm font-medium text-foreground/60">Group code</h3>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">
          {group.code}
        </p>
        <p className="mt-1 text-sm text-foreground/60">
          Send this code to friends. They enter it under Groups to join.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-medium text-foreground/60">
          {memberIds.length} {memberIds.length === 1 ? "member" : "members"}
        </h3>
        <ul className="mt-2 divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {memberIds.map((memberId) => (
            <li key={memberId} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="truncate font-medium">
                {nameById.get(memberId) ?? "New player"}
              </span>
              {memberId === user?.id && (
                <span className="text-foreground/60">You</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form action={leaveGroup} className="mt-8">
        <input type="hidden" name="groupId" value={group.id} />
        <button className="text-sm text-red-600 hover:underline">
          Leave this group
        </button>
      </form>
    </main>
  );
}
