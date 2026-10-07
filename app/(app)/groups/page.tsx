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
      <h2 className="text-lg font-semibold">Your groups</h2>
      <p className="mt-1 text-sm text-foreground/60">
        A group is you and your friends. Share its code so they can join.
      </p>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          Could not load your groups. Please refresh and try again.
        </p>
      )}

      {!error && (groups ?? []).length === 0 && (
        <p className="mt-6 text-sm text-foreground/60">
          You&apos;re not in a group yet. Join one with a code, or start your own.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {(groups ?? []).map((group) => {
          const count = memberCount.get(group.id) ?? 0;
          return (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 p-3 hover:border-foreground/40"
              >
                <span className="truncate font-medium">{group.name}</span>
                <span className="shrink-0 text-sm text-foreground/60">
                  {count} {count === 1 ? "member" : "members"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 space-y-6 border-t border-foreground/10 pt-6">
        <JoinGroupForm />
        <CreateGroupForm />
      </div>
    </main>
  );
}
