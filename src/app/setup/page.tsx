import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { TEXT } from "@/lib/auth/messages";
import { getSetupStatus } from "@/lib/supabase/admin";
import { SetupForm } from "./setup-form";
import styles from "../login/auth.module.css";

export const metadata: Metadata = { title: "Crear tu cuenta · pcUpgradeAPP" };

export default async function SetupPage() {
  await connection(); // siempre dinámica: el alta se cierra apenas existe un usuario
  const status = await getSetupStatus();
  if (status === "closed") redirect("/login");

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{TEXT.appName}</p>
        <h1 className={styles.title}>{TEXT.setupTitle}</h1>
        <p className={styles.subtitle}>{TEXT.setupSubtitle}</p>

        {status === "open" ? (
          <SetupForm />
        ) : (
          <div className={styles.alert} role="alert">
            <p>{status === "missing_env" ? TEXT.configMissing : TEXT.unexpected}</p>
          </div>
        )}
      </div>
    </main>
  );
}
