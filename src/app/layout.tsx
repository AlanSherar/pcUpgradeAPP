import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { TEXT } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import styles from "./login/auth.module.css";

export const metadata = {
  title: "pcUpgradeAPP",
  description: "Investigación de upgrades de PC con precios en vivo",
};

/** Email del usuario con sesión, o null (sin sesión, sin variables o sin red). */
async function getSessionEmail(): Promise<string | null> {
  // Fuera del try: marca el render como dinámico (la sesión vive en cookies) y no se traga
  // el aviso interno con el que Next corta el prerender estático.
  await connection();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? (data.user.email ?? "") : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const email = await getSessionEmail();

  return (
    <html lang="es-AR">
      <body style={{ margin: 0, background: "#f7f7f7", color: "#222222", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {email !== null ? (
          <header className={styles.sessionBar}>
            <Link href="/" className={styles.brand}>
              {TEXT.appName}
            </Link>
            <div className={styles.sessionRight}>
              {email ? <span className={styles.sessionEmail}>{email}</span> : null}
              <form action="/auth/signout" method="post" className={styles.signOutForm}>
                <button type="submit" className={styles.signOutButton}>
                  {TEXT.signOut}
                </button>
              </form>
            </div>
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
