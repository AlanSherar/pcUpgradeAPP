"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TEXT } from "@/lib/auth/messages";
import { signInWithPassword } from "@/lib/auth/sign-in";
import { isValidEmail } from "@/lib/auth/validate";
import { EmailField, PasswordField } from "./fields";
import styles from "./auth.module.css";

type FieldErrors = { email?: string; password?: string };

// `next` llega ya saneado por safeNext() en la página (solo rutas internas).
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false); // corta el doble envío antes de que React re-renderice
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Tras un error del servidor, el foco va al mensaje.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;

    const trimmedEmail = email.trim();
    const found: FieldErrors = {};
    if (!trimmedEmail) found.email = TEXT.emailRequired;
    else if (!isValidEmail(trimmedEmail)) found.email = TEXT.emailInvalid;
    if (!password) found.password = TEXT.passwordRequired;

    setErrors(found);
    setFormError(null);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    busy.current = true;
    setSubmitting(true);
    const message = await signInWithPassword(trimmedEmail, password);
    if (message === null) {
      // Recarga completa: el proxy y el layout leen la sesión nueva desde las cookies.
      window.location.assign(next);
      return;
    }
    busy.current = false;
    setSubmitting(false);
    setFormError(message);
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
          <p>{formError}</p>
        </div>
      ) : null}
      <EmailField
        id="email"
        label={TEXT.emailLabel}
        autoComplete="email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
        }}
        error={errors.email}
        inputRef={emailRef}
        autoFocus
      />
      <PasswordField
        id="password"
        label={TEXT.passwordLabel}
        autoComplete="current-password"
        value={password}
        onChange={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
        inputRef={passwordRef}
      />
      <button type="submit" className={styles.primary} disabled={submitting} aria-disabled={submitting}>
        {submitting ? TEXT.loginSubmitting : TEXT.loginSubmit}
      </button>
    </form>
  );
}
