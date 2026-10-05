"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(authenticate, null);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form action={formAction} className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pick&apos;em</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Pick winners with your friends. Sign in or create an account.
          </p>
        </div>

        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2"
          />
        </label>

        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="text-sm text-emerald-600">
            {state.message}
          </p>
        )}

        <div className="flex gap-3">
          <button
            name="intent"
            value="signin"
            disabled={pending}
            className="flex-1 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            Sign in
          </button>
          <button
            name="intent"
            value="signup"
            disabled={pending}
            className="flex-1 rounded-md border border-foreground/20 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
