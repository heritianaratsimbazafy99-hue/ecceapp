"use client";

import { useActionState } from "react";
import { useState } from "react";

import { signInAction } from "@/app/auth/actions";

const initialState = {
  error: ""
};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="auth-form auth-form-shell">
      <div className="auth-form-grid">
        <label>
          Email professionnel
          <input
            autoComplete="email"
            name="email"
            placeholder="coach@ecce.school"
            type="email"
          />
          <small className="auth-field-note">
            Utilise l&apos;adresse créée depuis le hub admin ECCE.
          </small>
        </label>

        <label>
          Mot de passe temporaire ou habituel
          <div className="auth-password-row">
            <input
              autoComplete="current-password"
              name="password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
            />
            <button
              className="auth-input-toggle"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? "Masquer" : "Voir"}
            </button>
          </div>
          <small className="auth-field-note">
            Les nouveaux comptes passent ensuite par une mise en route guidée.
          </small>
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <div className="auth-form-footer">
        <p>
          Connexion sécurisée Supabase avec redirection automatique selon le rôle et le statut du
          profil.
        </p>

        <button className="button button-block" disabled={pending} type="submit">
          {pending ? "Ouverture de l'espace..." : "Entrer dans ECCE"}
        </button>
      </div>
    </form>
  );
}
