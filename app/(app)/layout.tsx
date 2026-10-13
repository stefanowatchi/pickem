import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { Logo } from "@/app/logo";
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
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-5">
      <header>
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Pick'em home">
            <Logo />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/profile"
              title="Edit your profile"
              className="truncate text-sm font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent"
            >
              {profile.display_name}
            </Link>
            <form action={signOut} className="shrink-0">
              <button className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
        <NavLinks userId={user.id} />
      </header>
      {children}
    </div>
  );
}
