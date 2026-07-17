import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Centered card shell shared by all auth pages (RTL inherited from root layout). */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 font-extrabold text-lg bg-gradient-to-l from-primary to-chart-2 bg-clip-text text-transparent"
        >
          <ShieldCheck className="size-6 text-primary" />
          מערכת ניהול הסמכות · 228
        </Link>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
