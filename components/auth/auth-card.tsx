import Image from "next/image";
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
        {/* Prominent brand mark above the form. Native asset is 500×678 — height-driven
            classes with `w-auto` keep that aspect ratio at every breakpoint. */}
        <div className="flex justify-center">
          <Image
            src="/logo228.png"
            alt="לוגו 228 · מערכת ניהול הסמכות"
            width={500}
            height={678}
            priority
            className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto"
          />
        </div>
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
