import Link from "next/link";
import { CreateGroupForm, JoinGroupForm } from "@/app/group-forms";
import { createClient } from "@/lib/supabase/server";

type Group = { id: string; name: string };

export default async function GroupsPage() {
  const supabase = await createClient();

  // Database rules only return groups the signed-in user belongs to.
  const [{ data: groups, error }, { data: members }] = await Promise.all([
    supabase.from("groups").select("id, name").order("name").returns<Group[]>(),
    supabase.from("group_members").select("group_id").returns<{ group_id: string }[]>(),
  ]);

  const memberCount = new Map<string, number>();
  for (const member of members ?? []) {
    memberCount.set(member.group_id, (memberCount.get(member.group_id) ?? 0) + 1);
  }

  return (
    <main className="py-6">
      <h2 className="display text-3xl">Your groups</h2>
      <p className="mt-2 text-sm text-muted">
        A group is you and your friends on one leaderboard. Share its code so
        they can join.
      </p>

      {error && (
        <p role="alert" className="mt-6 text-sm text-loss">
          Could not load your groups. Please refresh and try again.
        </p>
      )}

      {!error && (groups ?? []).length === 0 && (
        <p className="card mt-6 p-6 text-center text-sm text-muted">
          You&apos;re not in a group yet. Join one with a code, or start your own.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {(groups ?? []).map((group) => {
          const count = memberCount.get(group.id) ?? 0;
          return (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-accent"
              >
                <span className="display truncate text-2xl">{group.name}</span>
                <span className="label shrink-0">
                  {count} {count === 1 ? "member" : "members"} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <JoinGroupForm />
        <CreateGroupForm />
      </div>
    </main>
  );
}
