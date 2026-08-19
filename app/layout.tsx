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
import { getCurrentUser } from "@/lib/auth/user";
import { isBrigade } from "@/lib/auth/permissions";
import { navLinksForView } from "@/lib/auth/nav";
import { scopedBattalionIdOf } from "@/lib/auth/battalion-scope";
import { getBattalionById } from "@/lib/db/repositories/battalions";

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
  const [role, me] = await Promise.all([getCurrentRole(), getCurrentUser()]);

  // The visible tabs come from the authenticated user's real row, resolved here on the
  // server — never from the `active_role` cookie and never from a client fetch, which
  // would paint the full tab list first and only then hide the forbidden ones.
  // `role` only narrows the result: it hides the two battalion-only tabs from a brigade
  // view that has selected no battalion. What the user may see at all still comes from
  // their authenticated row inside navLinksFor.
  const navLinks = navLinksForView(me, role);
  const scopedBattalionId = scopedBattalionIdOf(me);
  const scopedBattalion =
    scopedBattalionId === null ? null : (await getBattalionById(scopedBattalionId)) ?? null;

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
            <MainNav links={navLinks} scopedBattalionName={scopedBattalion?.name ?? null} />
            {/* The open-tasks bar is a brigade-wide worklist across every battalion, so a
                battalion-scoped user never gets it. */}
            {isBrigade(role) && scopedBattalionId === null && (
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
