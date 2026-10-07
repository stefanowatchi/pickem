"use client";

import { useActionState } from "react";
import {
  createGroup,
  joinGroup,
  saveDisplayName,
  type FormState,
} from "@/app/actions";

const inputClass =
  "w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm";
const buttonClass =
  "shrink-0 whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-600">
      {state.error}
    </p>
  );
}

export function NameForm() {
  const [state, formAction, pending] = useActionState(saveDisplayName, null);

  return (
    <form action={formAction} className="mt-5">
      <label className="block text-sm font-medium">
        Display name
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <FormError state={state} />
      <button disabled={pending} className={`mt-4 w-full ${buttonClass}`}>
        Continue
      </button>
    </form>
  );
}

export function JoinGroupForm() {
  const [state, formAction, pending] = useActionState(joinGroup, null);

  return (
    <form action={formAction}>
      <label htmlFor="group-code" className="block text-sm font-medium">
        Join with a code
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="group-code"
          name="code"
          required
          minLength={6}
          maxLength={6}
          placeholder="ABC234"
          autoComplete="off"
          autoCapitalize="characters"
          className={`${inputClass} font-mono uppercase tracking-widest placeholder:tracking-widest`}
        />
        <button disabled={pending} className={buttonClass}>
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
    <form action={formAction}>
      <label htmlFor="group-name" className="block text-sm font-medium">
        Start a new group
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="group-name"
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Group name"
          autoComplete="off"
          className={inputClass}
        />
        <button disabled={pending} className={buttonClass}>
          Create
        </button>
      </div>
      <FormError state={state} />
    </form>
  );
}
