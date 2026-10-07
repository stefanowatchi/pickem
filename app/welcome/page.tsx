import { redirect } from "next/navigation";
import { NameForm } from "@/app/group-forms";
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose your name
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          This is what your friends see in groups. Your email stays private.
        </p>
        <NameForm />
      </div>
    </main>
  );
}
