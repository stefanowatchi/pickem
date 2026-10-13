import { redirect } from "next/navigation";
import { NameForm } from "@/app/group-forms";
import { Logo } from "@/app/logo";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo size="lg" />
        <h1 className="display mt-8 text-2xl">Choose your name</h1>
        <p className="mt-2 text-sm text-muted">
          This is what your friends see on the leaderboard. Your email stays
          private.
        </p>
        <NameForm />
      </div>
    </main>
  );
}
