import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy notice" };

export default async function Privacy() {
  const st = await getSettings();
  return (
    <>
      <PageHeader title="Privacy notice" lead="How GUVTC uses the personal information you give us." />
      <div className="container-page py-12 prose-guvtc">
        <p><strong>Draft for review.</strong> This notice must be checked against Zimbabwe's Cyber and Data Protection Act and government ICT policy by the centre's responsible authority before launch.</p>
        <p><strong>What we collect.</strong> Enquiries: your name, contact details and question. Applications: the details on the form and the documents you upload. Students: academic records, attendance, results and fee records.</p>
        <p><strong>Why.</strong> To answer enquiries, process applications, deliver training, record results and manage fees. We do not sell your information or use it for unrelated marketing.</p>
        <p><strong>Who can see it.</strong> Only staff whose role requires it — for example, marketing staff cannot see marks or financial records. Every change to applications, results and financial records is logged.</p>
        <p><strong>AI features.</strong> AI tools are never used to make admission or grading decisions.</p>
        <p><strong>Website analytics.</strong> We count advert clicks and completed applications per campaign. These reports never show individual students.</p>
        <p><strong>Your rights.</strong> You may ask to see or correct the information we hold about you by writing to {st.contact_email}.</p>
      </div>
    </>
  );
}
