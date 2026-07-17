import type { Metadata } from "next";
import { Heebo } from "next/font/google";
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
      </body>
    </html>
  );
}
