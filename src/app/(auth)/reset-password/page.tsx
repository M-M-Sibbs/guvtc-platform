import { ResetForm } from "@/components/auth/forms";
export const metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (<><h1 className="text-3xl font-semibold">Choose a new password</h1><div className="mt-8"><ResetForm token={token ?? ""} /></div></>);
}
