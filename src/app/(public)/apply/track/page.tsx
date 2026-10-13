import type { Metadata } from "next";
import { TrackForm } from "@/components/public/track-form";
import { uploadMode } from "@/lib/storage";

export const metadata: Metadata = { title: "Track your application", robots: { index: false } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="bg-mist-2 pb-16">
      <div className="bg-navy text-white"><div className="container-page py-10">
        <h1 className="text-4xl font-semibold">Track your application</h1>
        <p className="mt-3 text-mist">Enter the reference number from your confirmation email and the email address you applied with.</p>
      </div></div>
      <div className="container-page mt-8 max-w-3xl"><TrackForm initialRef={ref} uploadMode={uploadMode()} /></div>
    </div>
  );
}
