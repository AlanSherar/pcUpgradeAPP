"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TEXT } from "@/lib/auth/messages";
import { signInWithPassword } from "@/lib/auth/sign-in";
import { isValidEmail, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/validate";
import { EmailField, PasswordField } from "../login/fields";
import styles from "../login/auth.module.css";

type FieldErrors = { email?: string; password?: string; confirm?: string };
// loginLink: agrega "Entrá con tu email." → /login (E8, E9b). locked: deshabilita el form (E8).
type FormError = { text: string; loginLink?: boolean; locked?: boolean };

export function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false); // corta el doble envío antes de que React re-renderice
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  function validate(trimmedEmail: string): FieldErrors {
    const found: FieldErrors = {};
    if (!trimmedEmail) found.email = TEXT.emailRequired;
    else if (!isValidEmail(trimmedEmail)) found.email = TEXT.emailInvalid;
    if (!password) found.password = TEXT.passwordRequired;
    else if (password.length < PASSWORD_MIN) found.password = TEXT.passwordShort;
    else if (password.length > PASSWORD_MAX) found.password = TEXT.passwordLong;
    if (!confirm) found.confirm = TEXT.confirmRequired;
    else if (password && confirm !== password) found.confirm = TEXT.confirmMismatch;
    return found;
  }

  function fail(error: FormError) {
    busy.current = false;
    setSubmitting(false);
    setFormError(error);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || formError?.locked) return;

    const trimmedEmail = email.trim();
    const found = validate(trimmedEmail);
    setErrors(found);
    setFormError(null);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();
    if (found.confirm) return confirmRef.current?.focus();

    busy.current = true;
    setSubmitting(true);

    let res: Response;
    try {
      res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
    } catch {
      return fail({ text: TEXT.network }); // E6
    }

    if (res.status === 409) return fail({ text: TEXT.setupClosed, loginLink: true, locked: true }); // E8
    if (res.status !== 201) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      const code = body?.error;
      if (code === "missing_env") return fail({ text: TEXT.configMissing }); // E7
      if (code === "weak_password") {
        busy.current = false;
        setSubmitting(false);
        setErrors({ password: TEXT.weakPassword });
        passwordRef.current?.focus();
        return;
      }
      if (res.status === 429) return fail({ text: TEXT.tooManyAttempts }); // E5
      return fail({ text: TEXT.unexpected }); // E11: 400 y 5xx no cubiertos
    }

    // E9: cuenta creada → inicia sesión y entra directo. El botón sigue en "Creando…".
    const message = await signInWithPassword(trimmedEmail, password);
    if (message === null) {
      // El cliente de @supabase/ssr ya escribió la sesión en las cookies; la navegación cliente
      // las manda al proxy. replace: Atrás no vuelve al setup. refresh: vuelve a pedir al servidor
      // el layout raíz (que persiste entre navegaciones) para que aparezca la barra "Salir".
      router.replace("/");
      router.refresh();
      return;
    }
    fail({ text: TEXT.createdButNoSession, loginLink: true }); // E9b
  }

  const locked = Boolean(formError?.locked);

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
          <p>
            {formError.text}
            {formError.loginLink ? (
              <>
                {" "}
                <Link href="/login" className={styles.link}>
                  {TEXT.goToLogin}
                </Link>
              </>
            ) : null}
          </p>
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
        readOnly={submitting}
        disabled={locked}
      />
      <PasswordField
        id="password"
        label={TEXT.passwordLabel}
        autoComplete="new-password"
        hint={TEXT.passwordHint}
        value={password}
        onChange={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
        inputRef={passwordRef}
        readOnly={submitting}
        disabled={locked}
      />
      <PasswordField
        id="confirm"
        label={TEXT.confirmLabel}
        autoComplete="new-password"
        showLabel={TEXT.showConfirm}
        hideLabel={TEXT.hideConfirm}
        value={confirm}
        onChange={(v) => {
          setConfirm(v);
          if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
        }}
        error={errors.confirm}
        inputRef={confirmRef}
        readOnly={submitting}
        disabled={locked}
      />
      <button
        type="submit"
        className={styles.primary}
        disabled={submitting || locked}
        aria-busy={submitting || undefined}
      >
        {submitting ? TEXT.setupSubmitting : TEXT.setupSubmit}
      </button>
    </form>
  );
}
