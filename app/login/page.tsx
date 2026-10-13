"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions";
import { Logo } from "@/app/logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(authenticate, null);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo size="lg" />
        <p className="mt-3 text-muted">
          Call the winners. Beat your friends. Real odds, every game.
        </p>

        <form action={formAction} className="card mt-8 space-y-4 p-5">
          <label className="block">
            <span className="label">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field mt-1.5"
            />
          </label>

          <label className="block">
            <span className="label">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
              className="field mt-1.5"
            />
          </label>

          {state?.error && (
            <p role="alert" className="text-sm text-loss">
              {state.error}
            </p>
          )}
          {state?.message && (
            <p role="status" className="text-sm text-win">
              {state.message}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              name="intent"
              value="signin"
              disabled={pending}
              className="btn-primary flex-1"
            >
              Sign in
            </button>
            <button
              name="intent"
              value="signup"
              disabled={pending}
              className="btn-ghost flex-1"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
