import { ForgotForm } from "@/components/auth/forms";
export const metadata = { title: "Forgot password", robots: { index: false } };
export default function Page() {
  return (<><h1 className="text-3xl font-semibold">Reset your password</h1><p className="mt-2 mb-8 text-slate">Enter the email on your account and we will send a reset link.</p><ForgotForm /></>);
}
