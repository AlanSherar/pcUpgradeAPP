"use client";

import { useState, type Ref } from "react";
import { TEXT } from "@/lib/auth/messages";
import styles from "./auth.module.css";

// Campos accesibles compartidos por /login y /setup:
// label visible, error junto al campo (leído por aria-describedby al recibir foco), aria-invalid.
// Sin role="alert" en el error de campo: el foco ya lo anuncia y evita la doble lectura (spec §1.5).

type BaseProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

type PasswordProps = BaseProps & { showLabel?: string; hideLabel?: string };

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function FieldMessages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  // E2d: el error reemplaza visualmente a la ayuda.
  return (
    <>
      {hint && !error ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </>
  );
}

export function EmailField(props: BaseProps) {
  const { id, label, value, onChange, autoComplete, error, hint, inputRef, autoFocus, disabled, readOnly } = props;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        disabled={disabled}
        readOnly={readOnly}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error ? undefined : hint, error)}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export function PasswordField(props: PasswordProps) {
  const { id, label, value, onChange, autoComplete, error, hint, inputRef, disabled, readOnly } = props;
  const showLabel = props.showLabel ?? TEXT.showPassword;
  const hideLabel = props.hideLabel ?? TEXT.hidePassword;
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.passwordRow}>
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          readOnly={readOnly}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error ? undefined : hint, error)}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? hideLabel : showLabel}
          aria-controls={id}
        >
          {visible ? TEXT.hide : TEXT.show}
        </button>
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}
