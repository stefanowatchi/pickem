"use client";

import { useActionState } from "react";
import {
  createGroup,
  joinGroup,
  saveDisplayName,
  type FormState,
} from "@/app/actions";

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-loss">
      {state.error}
    </p>
  );
}

export function NameForm() {
  const [state, formAction, pending] = useActionState(saveDisplayName, null);

  return (
    <form action={formAction} className="card mt-6 p-5">
      <label className="block">
        <span className="label">Display name</span>
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          className="field mt-1.5"
        />
      </label>
      <FormError state={state} />
      <button disabled={pending} className="btn-primary mt-4 w-full">
        Let&apos;s go
      </button>
    </form>
  );
}

export function JoinGroupForm() {
  const [state, formAction, pending] = useActionState(joinGroup, null);

  return (
    <form action={formAction} className="card p-4">
      <label htmlFor="group-code" className="label">
        Join with a code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="group-code"
          name="code"
          required
          minLength={6}
          maxLength={6}
          placeholder="ABC234"
          autoComplete="off"
          autoCapitalize="characters"
          className="field font-mono uppercase tracking-[0.3em]"
        />
        <button disabled={pending} className="btn-primary">
          Join
        </button>
      </div>
      <FormError state={state} />
    </form>
  );
}

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(createGroup, null);

  return (
    <form action={formAction} className="card p-4">
      <label htmlFor="group-name" className="label">
        Start a new group
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="group-name"
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Sunday Crew"
          autoComplete="off"
          className="field"
        />
        <button disabled={pending} className="btn-ghost">
          Create
        </button>
      </div>
      <FormError state={state} />
    </form>
  );
}
