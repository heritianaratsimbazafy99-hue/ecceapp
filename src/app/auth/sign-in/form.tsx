"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/auth/actions";

const initialState = {
  error: ""
};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="auth-form">
      <label>
        Email
        <input name="email" placeholder="coach@ecce.school" type="email" />
      </label>
      <label>
        Mot de passe
        <input name="password" placeholder="••••••••" type="password" />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Connexion..." : "Continuer"}
      </button>
    </form>
  );
}
