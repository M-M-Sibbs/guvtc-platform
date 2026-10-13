import Link from "next/link";
import { desc, count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveNews, saveGalleryItem, toggleGalleryItem } from "@/app/actions/staff/admin";
import { fmtDate, toLocalInput, cn } from "@/lib/utils";
import { uploadMode } from "@/lib/storage";
import { UploadField } from "@/components/ui/upload-field";

export const metadata = { title: "News, events & gallery" };

export default async function NewsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("news.manage");
  const sp = await searchParams;
  const tab = sp.tab === "gallery" ? "gallery" : "news";
  const [posts, regs, gallery] = await Promise.all([
    db.select().from(s.newsPosts).orderBy(desc(s.newsPosts.createdAt)),
    db.select({ newsId: s.eventRegistrations.newsId, n: count() }).from(s.eventRegistrations).groupBy(s.eventRegistrations.newsId),
    db.select().from(s.galleryItems).orderBy(desc(s.galleryItems.createdAt)),
  ]);
  const editing = sp.edit ? posts.find((p) => p.id === sp.edit) : undefined;
  const regList = sp.regs ? await db.select().from(s.eventRegistrations).where(eq(s.eventRegistrations.newsId, sp.regs)) : [];
  return (
    <>
      <PortalTitle title="News, events & gallery" lead="Announcements, open days, notices, verified opportunities and student work for the public website." />
      <Flash searchParams={searchParams} />
      <nav className="mb-6 flex gap-1 border-b border-line">
        {[["news", "News & events"], ["gallery", "Gallery"]].map(([t, l]) => <Link key={t} href={`?tab=${t}`} className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-navy" : "border-transparent text-slate")}>{l}</Link>)}
      </nav>
      {tab === "news" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="panel overflow-x-auto">
              <table className="table-std">
                <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {posts.map((p) => {
                    const r = regs.find((x) => x.newsId === p.id)?.n ?? 0;
                    return (
                      <tr key={p.id}>
                        <td className="font-medium">{p.title}</td><td>{p.kind.toLowerCase()}</td>
                        <td className="text-sm">{fmtDate(p.eventDate ?? p.publishedAt)}</td>
                        <td>{p.published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}</td>
                        <td className="whitespace-nowrap text-sm"><Link className="underline" href={`?edit=${p.id}`}>Edit</Link>{p.registrable && <> · <Link className="underline" href={`?regs=${p.id}`}>{r} registered</Link></>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sp.regs && (
              <section className="panel p-5">
                <h2 className="font-display text-lg font-semibold">Registrations ({regList.length})</h2>
                <table className="table-std mt-2"><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
                  <tbody>{regList.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td></tr>)}</tbody></table>
              </section>
            )}
          </div>
          <section className="panel h-fit p-5">
            <h2 className="font-display text-lg font-semibold">{editing ? "Edit post" : "New post"}</h2>
            <form action={saveNews} className="mt-3 grid gap-3" encType="multipart/form-data">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              {editing?.imageUrl && <input type="hidden" name="existingImage" value={editing.imageUrl} />}
              <select name="kind" className="input" defaultValue={editing?.kind ?? "NEWS"}><option value="NEWS">News</option><option value="EVENT">Event / open day</option><option value="NOTICE">Official notice</option><option value="OPPORTUNITY">Career opportunity (verified)</option></select>
              <input name="title" className="input" placeholder="Title" defaultValue={editing?.title} />
              <input name="excerpt" className="input" placeholder="One-sentence summary" defaultValue={editing?.excerpt} />
              <textarea name="body" rows={6} className="input" placeholder="Full text" defaultValue={editing?.body} />
              <div className="grid grid-cols-2 gap-3"><input name="eventDate" type="datetime-local" className="input" defaultValue={toLocalInput(editing?.eventDate)} aria-label="Event date" /><input name="location" className="input" placeholder="Venue" defaultValue={editing?.location ?? ""} /></div>
              <UploadField name="image" kind="image" folder="public/news" mode={uploadMode()} accept="image/jpeg,image/png,image/webp" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registrable" defaultChecked={editing?.registrable} className="accent-navy" />Allow online registration (events)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={editing?.published ?? true} className="accent-navy" />Published</label>
              <SubmitButton>Save</SubmitButton>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {gallery.map((g) => (
              <li key={g.id} className="panel overflow-hidden">
                {g.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={g.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  : <div className="grid aspect-[4/3] place-items-center bg-mist text-xs text-slate">No photo yet</div>}
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-sm"><span className="font-medium">{g.title}</span><span className="block text-xs text-slate">{g.category}</span></span>
                  <form action={toggleGalleryItem}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="published" value={String(!g.published)} /><button className="text-xs underline">{g.published ? "Hide" : "Show"}</button></form>
                </div>
              </li>
            ))}
          </ul>
          <section className="panel h-fit p-5">
            <h2 className="font-display text-lg font-semibold">Add student work or facility photo</h2>
            <form action={saveGalleryItem} className="mt-3 grid gap-3" encType="multipart/form-data">
              <input name="title" className="input" placeholder="Title" />
              <input name="category" className="input" placeholder="Category e.g. Fashion" />
              <input name="caption" className="input" placeholder="Caption" />
              <UploadField name="image" kind="image" folder="public/gallery" mode={uploadMode()} accept="image/jpeg,image/png,image/webp" />
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-1 accent-navy" />Permission from the student (and anyone pictured) has been recorded.</label>
              <SubmitButton>Add to gallery</SubmitButton>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
