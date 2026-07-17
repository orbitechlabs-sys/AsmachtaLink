import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export const metadata: Metadata = {
  title: "איפוס סיסמה · מערכת ניהול הסמכות",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="איפוס סיסמה"
      description="הזינו את כתובת האימייל ונשלח אליכם קישור לאיפוס"
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
