import type { ReactNode } from "react";
import type { Metadata } from "next";

import { getDefaultOrganizationBranding } from "@/lib/organization";

import "./globals.css";

export const metadata: Metadata = {
  title: "ECCE Platform",
  description:
    "Plateforme moderne de coaching, contenus pédagogiques, évaluations et accompagnement pour ECCE."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const branding = await getDefaultOrganizationBranding();

  return (
    <html lang={branding.defaultLocale || "fr"}>
      <body>{children}</body>
    </html>
  );
}
