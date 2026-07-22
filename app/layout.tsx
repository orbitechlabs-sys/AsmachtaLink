import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Direction } from "radix-ui";
import "./globals.css";
import { MainNav } from "@/components/layout/main-nav";
import { OpenTasksBar } from "@/components/layout/open-tasks-bar";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { Toaster } from "@/components/ui/sonner";
import { RoleProvider } from "@/lib/auth/role-context";
import { getCurrentRole } from "@/lib/auth/current-role";
import { isBrigade } from "@/lib/auth/permissions";

const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מערכת ניהול הסמכות - 228",
  description: "מערכת לניהול הסמכות חטיבתיות",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getCurrentRole();

  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Testim) inject
          attributes like data-testim-* onto <body> before React hydrates,
          which would otherwise trip a hydration mismatch. This only suppresses
          warnings for <body>'s own attributes, not its children. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground"
      >
        {/* Make all Radix primitives (Tabs, DropdownMenu, …) inherit RTL.
            Without this they default to dir="ltr", which flips e.g. table
            column order inside <Tabs>. */}
        <Direction.DirectionProvider dir="rtl">
          <RoleProvider>
            <MainNav />
            {isBrigade(role) && (
              <ChromeGate>
                <OpenTasksBar />
              </ChromeGate>
            )}
            <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
              {children}
            </main>
            <Toaster />
          </RoleProvider>
        </Direction.DirectionProvider>
      </body>
    </html>
  );
}
