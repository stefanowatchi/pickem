import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { NavLinks } from "@/app/nav-links";
import { createClient } from "@/lib/supabase/server";

// Shared header for every signed-in page. Sends new players to pick a name first.
export default async function AppLayout({ children }: LayoutProps<"/">) {
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
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="border-b border-foreground/10 pb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Pick&apos;em</h1>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="truncate text-foreground/60">
              {profile.display_name}
            </span>
            <form action={signOut} className="shrink-0">
              <button className="whitespace-nowrap rounded-md border border-foreground/20 px-3 py-1.5 font-medium hover:border-foreground/50">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <NavLinks />
      </header>
      {children}
    </div>
  );
}
