import "./globals.css";
import "leaflet/dist/leaflet.css";

import AppShell from "@/components/AppShell";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}