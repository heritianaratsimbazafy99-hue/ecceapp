import type { ReactNode } from "react";

import { PlatformSidebar } from "@/components/layout/platform-sidebar";

export default function PlatformLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="platform-layout">
      <PlatformSidebar />
      <section className="platform-content">{children}</section>
    </main>
  );
}
