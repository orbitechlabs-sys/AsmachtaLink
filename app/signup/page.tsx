import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "הרשמה · מערכת ניהול הסמכות",
};

export default function SignupPage() {
  return (
    <AuthCard title="הרשמה" description="יצירת חשבון חדש למערכת">
      <SignupForm />
    </AuthCard>
  );
}
