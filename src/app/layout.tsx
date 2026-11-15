import type { ReactNode } from "react";

export const metadata = {
  title: "pcUpgradeAPP",
  description: "Investigación de upgrades de PC con precios en vivo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
