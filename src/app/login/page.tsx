import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { TEXT } from "@/lib/auth/messages";
import { safeNext } from "@/lib/auth/safe-next";
import { getSetupStatus } from "@/lib/supabase/admin";
import { LoginForm } from "./login-form";
import styles from "./auth.module.css";

export const metadata: Metadata = { title: "Entrar · pcUpgradeAPP" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // siempre dinámica: el estado del alta cambia en ejecución
  const params = await searchParams;
  const next = safeNext(params.next);
  const expired = params.expired === "1";
  const status = await getSetupStatus();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {expired && status !== "open" && status !== "missing_env" ? (
          <div className={styles.notice} role="status">
            <p>{TEXT.sessionExpired}</p>
          </div>
        ) : null}
        <h1 className={styles.title}>{TEXT.appName}</h1>
        {status === "open" ? null : <p className={styles.subtitle}>{TEXT.loginSubtitle}</p>}

        {status === "missing_env" ? (
          <div className={styles.alert} role="alert">
            <p>{TEXT.configMissing}</p>
          </div>
        ) : status === "open" ? (
          // Con 0 usuarios no hay con qué entrar: la única acción es crear la cuenta.
          <>
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>{TEXT.setupOpenNotice}</p>
              <p>{TEXT.setupOpenBody}</p>
            </div>
            <Link href="/setup" className={styles.linkButton}>
              {TEXT.setupOpenLink}
            </Link>
          </>
        ) : (
          <LoginForm next={next} />
        )}
      </div>
    </main>
  );
}
