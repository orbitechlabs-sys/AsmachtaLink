import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "עדכון סיסמה · מערכת ניהול הסמכות",
};

export default function UpdatePasswordPage() {
  return (
    <AuthCard title="עדכון סיסמה" description="בחרו סיסמה חדשה לחשבון שלכם">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
