"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitApplication, type ApplyState } from "@/app/actions/apply";
import { CONFIGURABLE_FIELDS, DOC_TYPES, STEP_FIELDS, type ConfigurableField } from "@/schemas/application-fields";
import { Field, Notice } from "@/components/ui/ui";
import { Icon } from "@/components/ui/icons";
import { DELIVERY_LABELS, cn } from "@/lib/utils";
import { UploadField } from "@/components/ui/upload-field";
import type { UploadMode } from "@/lib/upload-rules";

export type ApplyCourse = {
  id: string; slug: string; name: string; category: string; modes: string[];
  intakes: { id: string; name: string; start: string; deadline: string | null }[];
};

const STEPS = ["Course", "About you", "Education & support", "Documents", "Review & submit"];
const DRAFT_KEY = "guvtc-application-draft-v1";
// Sensitive fields are never written to the device draft.
const NOT_SAVED = new Set(["nationalId", "dateOfBirth", "consent", "website"]);

export function ApplyForm({ courses, required, preselect, uploadMode }: { courses: ApplyCourse[]; required: ConfigurableField[]; preselect?: string; uploadMode: UploadMode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string[]>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [saveDraft, setSaveDraft] = useState(true);
  const [restored, setRestored] = useState(false);
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, {});
  const req = useMemo(() => new Set<string>(["courseId", "firstName", "lastName", "email", "phone", ...required]), [required]);

  // Restore draft / preselected course
  useEffect(() => {
    let draft: Record<string, string> = {};
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}"); } catch {}
    const pre = courses.find((c) => c.slug === preselect);
    if (pre) draft.courseId = pre.id;
    if (Object.keys(draft).length) {
      setValues(draft);
      setRestored(Object.keys(draft).some((k) => k !== "courseId"));
    }
  }, [courses, preselect]);

  useEffect(() => {
    if (!saveDraft) return;
    const t = setTimeout(() => {
      try {
        const safe = Object.fromEntries(Object.entries(values).filter(([k]) => !NOT_SAVED.has(k)));
        localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [values, saveDraft]);

  useEffect(() => {
    if (state.ok && state.reference) {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      router.push(`/apply/success?ref=${encodeURIComponent(state.reference)}`);
    } else if (state.errors || state.message) {
      // In local mode the browser clears file inputs after a server round-trip, so ask for them again.
      // (In blob mode the files are already uploaded and their references are kept.)
      if (uploadMode === "local") setFileNames({});
      // jump to the first step with a server error
      const first = STEP_FIELDS.findIndex((fs) => fs.some((f) => state.errors?.[f]));
      if (first >= 0) setStep(first);
      if (state.errors?.documents) setStep(3);
    }
  }, [state, router]);

  const errors = { ...state.errors, ...localErrors };
  const course = courses.find((c) => c.id === values.courseId);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === "checkbox" ? ((e.target as HTMLInputElement).checked ? "on" : "") : e.target.value;
    setValues((old) => ({ ...old, [k]: v, ...(k === "courseId" ? { intakeId: "", deliveryMode: "" } : {}) }));
    setLocalErrors((old) => ({ ...old, [k]: "" }));
  };
  const onFiles = (k: string) => (names: string[], error?: string) => {
    setLocalErrors((o) => ({ ...o, [k]: error ?? "" }));
    setFileNames((o) => ({ ...o, [k]: error ? [] : names }));
  };

  function validateStep(n: number) {
    const errs: Record<string, string> = {};
    for (const f of STEP_FIELDS[n]) {
      const isDoc = f.startsWith("doc_");
      const empty = isDoc ? !(fileNames[f]?.length) : !values[f]?.trim();
      if (req.has(f) && empty) errs[f] = f === "courseId" ? "Choose a course" : `${label(f)} is required`;
    }
    if (n === 1) {
      if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) errs.email = "Enter a valid email address — we send your reference here";
      if (values.phone && !/^[+0-9 ()-]{7,20}$/.test(values.phone)) errs.phone = "Enter a valid phone number, e.g. +263 77 123 4567";
    }
    if (n === 3) for (const k of Object.keys(DOC_TYPES)) if (localErrors[k]) errs[k] = localErrors[k];
    setLocalErrors(errs);
    return Object.values(errs).every((v) => !v);
  }

  function next() {
    if (validateStep(step)) { setStep((s) => Math.min(s + 1, STEPS.length - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    for (let n = 0; n < STEPS.length - 1; n++) {
      if (!validateStep(n)) { e.preventDefault(); setStep(n); return; }
    }
    if (values.consent !== "on") { e.preventDefault(); setLocalErrors({ consent: "Please confirm the declaration to submit" }); }
  }

  const input = (k: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={k} name={k} className="input" value={values[k] ?? ""} onChange={set(k)} aria-invalid={!!errors[k]}
      aria-describedby={errors[k] ? `${k}-error` : undefined} required={req.has(k)} {...props} />
  );
  const textarea = (k: string, rows = 3) => (
    <textarea id={k} name={k} rows={rows} className="input" value={values[k] ?? ""} onChange={set(k)} aria-invalid={!!errors[k]} />
  );

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} noValidate encType="multipart/form-data">
      <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      {/* Progress */}
      <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Application progress">
        {STEPS.map((t, i) => (
          <li key={t}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step}
              className={cn("w-full text-left", i < step && "cursor-pointer")} aria-current={i === step ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-navy" : "bg-line")} />
              <span className={cn("mt-2 hidden text-xs sm:block", i === step ? "font-semibold" : "text-slate")}>{i + 1}. {t}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-6 text-sm text-slate sm:hidden">Step {step + 1} of {STEPS.length}: <strong className="text-navy">{STEPS[step]}</strong></p>

      {restored && step === 0 && (
        <Notice tone="gold">We restored the draft you started on this device. ID number, date of birth and documents are never saved, so you will need to add them again.
          <button type="button" className="ml-2 underline" onClick={() => { localStorage.removeItem(DRAFT_KEY); setValues({}); setRestored(false); }}>Start again</button>
        </Notice>
      )}
      {state.message && !state.ok && <div className="mb-6"><Notice tone="danger">{state.message}</Notice></div>}

      {/* Step 1 — Course */}
      <fieldset className={cn("grid gap-5", step !== 0 && "hidden")}>
        <legend className="mb-2 font-display text-2xl font-semibold">Which course are you applying for?</legend>
        <Field label="Course" name="courseId" required error={errors.courseId}>
          <select id="courseId" name="courseId" className="input" value={values.courseId ?? ""} onChange={set("courseId")} aria-invalid={!!errors.courseId}>
            <option value="">Choose a course…</option>
            {Object.entries(groupBy(courses, (c) => c.category)).map(([cat, list]) => (
              <optgroup key={cat} label={cat}>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            ))}
          </select>
        </Field>
        {course && (
          <>
            <Field label="Preferred intake" name="intakeId" hint={course.intakes.length ? undefined : "No intake is scheduled yet — we will offer you the next one."}>
              <select id="intakeId" name="intakeId" className="input" value={values.intakeId ?? ""} onChange={set("intakeId")} disabled={!course.intakes.length}>
                <option value="">{course.intakes.length ? "Next available intake" : "Next available intake"}</option>
                {course.intakes.map((i) => <option key={i.id} value={i.id}>{i.name} — starts {i.start}{i.deadline ? `, apply by ${i.deadline}` : ""}</option>)}
              </select>
            </Field>
            {course.modes.length > 1 && (
              <Field label="How would you like to study?" name="deliveryMode">
                <select id="deliveryMode" name="deliveryMode" className="input" value={values.deliveryMode ?? ""} onChange={set("deliveryMode")}>
                  <option value="">No preference</option>
                  {course.modes.map((m) => <option key={m} value={m}>{DELIVERY_LABELS[m] ?? m}</option>)}
                </select>
              </Field>
            )}
          </>
        )}
      </fieldset>

      {/* Step 2 — Personal */}
      <fieldset className={cn("grid gap-5", step !== 1 && "hidden")}>
        <legend className="mb-2 font-display text-2xl font-semibold">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name(s)" name="firstName" required error={errors.firstName}>{input("firstName", { autoComplete: "given-name" })}</Field>
          <Field label="Surname" name="lastName" required error={errors.lastName}>{input("lastName", { autoComplete: "family-name" })}</Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email address" name="email" required error={errors.email} hint="Your reference number and decision are sent here.">{input("email", { type: "email", autoComplete: "email", inputMode: "email" })}</Field>
          <Field label="Mobile number" name="phone" required error={errors.phone}>{input("phone", { type: "tel", autoComplete: "tel", placeholder: "+263 77 123 4567" })}</Field>
        </div>
        <Field label="Residential address" name="address" required={req.has("address")} error={errors.address}>{input("address", { autoComplete: "street-address" })}</Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Date of birth" name="dateOfBirth" required={req.has("dateOfBirth")} error={errors.dateOfBirth}>{input("dateOfBirth", { type: "date", autoComplete: "bday" })}</Field>
          <Field label="Gender" name="gender" required={req.has("gender")} error={errors.gender}>
            <select id="gender" name="gender" className="input" value={values.gender ?? ""} onChange={set("gender")}>
              <option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option>
            </select>
          </Field>
          <Field label="National ID / passport no." name="nationalId" required={req.has("nationalId")} error={errors.nationalId}>{input("nationalId", { autoComplete: "off" })}</Field>
        </div>
      </fieldset>

      {/* Step 3 — Education & support */}
      <fieldset className={cn("grid gap-5", step !== 2 && "hidden")}>
        <legend className="mb-2 font-display text-2xl font-semibold">Education, experience and support</legend>
        <Field label="Highest qualification" name="highestQualification" required={req.has("highestQualification")} error={errors.highestQualification}>
          <select id="highestQualification" name="highestQualification" className="input" value={values.highestQualification ?? ""} onChange={set("highestQualification")}>
            <option value="">Choose…</option>
            {["Primary school", "ZJC / Form 2", "O Level", "A Level", "Certificate", "Diploma", "Degree", "Other"].map((q) => <option key={q}>{q}</option>)}
          </select>
        </Field>
        <Field label="Relevant results" name="results" hint="e.g. 5 O Levels including English and Maths">{textarea("results", 2)}</Field>
        <Field label="Previous training" name="priorTraining">{textarea("priorTraining", 2)}</Field>
        <Field label="Relevant work experience" name="experience">{textarea("experience", 2)}</Field>
        <Field label="Do you need any support or accessibility arrangements?" name="accessibility" hint="Only share what you are comfortable with. This helps us prepare.">{textarea("accessibility", 2)}</Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Emergency contact name" name="emergencyName" required={req.has("emergencyName")} error={errors.emergencyName}>{input("emergencyName")}</Field>
          <Field label="Emergency contact phone" name="emergencyPhone" required={req.has("emergencyPhone")} error={errors.emergencyPhone}>{input("emergencyPhone", { type: "tel" })}</Field>
        </div>
      </fieldset>

      {/* Step 4 — Documents (inputs always mounted so files are submitted) */}
      <fieldset className={cn("grid gap-5", step !== 3 && "hidden")}>
        <legend className="mb-2 font-display text-2xl font-semibold">Supporting documents</legend>
        <p className="-mt-2 text-sm text-slate">PDF, JPG, PNG or WebP, up to 10 MB each. Clear phone photos are fine.</p>
        {errors.documents && <Notice tone="danger">{errors.documents}</Notice>}
        {(Object.entries(DOC_TYPES) as [keyof typeof DOC_TYPES, string][]).map(([k, l]) => (
          <div key={k} className={cn("rounded-md border border-dashed p-4", errors[k] ? "border-danger" : "border-line")}>
            <label htmlFor={k} className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span>
                <span className="font-semibold">{l}</span>{" "}
                {req.has(k) ? <span className="text-danger">*</span> : <span className="text-sm text-slate">(optional)</span>}
                <span className="block text-sm text-slate">{fileNames[k]?.length ? fileNames[k].join(", ") : "No file chosen"}</span>
              </span>
              <span className="btn btn-outline btn-sm"><Icon.Upload size={16} />Choose file</span>
            </label>
            <UploadField id={k} name={k} kind="document" folder="applications" mode={uploadMode} multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" className="sr-only" onSelected={onFiles(k)} />
            {errors[k] && <p className="field-error" id={`${k}-error`}>{errors[k]}</p>}
          </div>
        ))}
      </fieldset>

      {/* Step 5 — Review */}
      <fieldset className={cn("grid gap-5", step !== 4 && "hidden")}>
        <legend className="mb-2 font-display text-2xl font-semibold">Check your answers</legend>
        <dl className="divide-y divide-line rounded-md border border-line text-sm">
          {[
            ["Course", course?.name], ["Intake", course?.intakes.find((i) => i.id === values.intakeId)?.name ?? "Next available"],
            ["Name", `${values.firstName ?? ""} ${values.lastName ?? ""}`], ["Email", values.email], ["Phone", values.phone],
            ["Address", values.address], ["Highest qualification", values.highestQualification],
            ["Emergency contact", [values.emergencyName, values.emergencyPhone].filter(Boolean).join(", ")],
            ["Documents", Object.values(fileNames).flat().join(", ") || "None"],
          ].map(([k, v], i) => (
            <div key={k} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
              <dt className="text-slate">{k}</dt><dd className="font-medium [overflow-wrap:anywhere]">{v || "—"}</dd>
              <button type="button" className="text-xs underline" onClick={() => setStep(i < 2 ? 0 : i < 6 ? 1 : i < 8 ? 2 : 3)}>Change</button>
            </div>
          ))}
        </dl>
        <label className={cn("flex gap-3 rounded-md border p-4", errors.consent ? "border-danger" : "border-line")}>
          <input type="checkbox" name="consent" checked={values.consent === "on"} onChange={set("consent")} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
          <span className="text-sm">
            I confirm the information I have given is true and complete. I understand GUVTC will use it to process my application and, if I am admitted, to manage my studies, as described in the <a href="/privacy" target="_blank" className="underline">privacy notice</a>.
          </span>
        </label>
        {errors.consent && <p className="field-error">{errors.consent}</p>}
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <div>{step > 0 && <button type="button" onClick={back} className="btn btn-outline"><Icon.Back size={16} />Back</button>}</div>
        <div className="flex items-center gap-4">
          <label className="hidden items-center gap-2 text-sm text-slate sm:flex">
            <input type="checkbox" checked={saveDraft} onChange={(e) => { setSaveDraft(e.target.checked); if (!e.target.checked) localStorage.removeItem(DRAFT_KEY); }} className="accent-navy" />
            Save draft on this device
          </label>
          {step < STEPS.length - 1
            ? <button type="button" onClick={next} className="btn btn-primary">Continue</button>
            : <button type="submit" disabled={pending} className="btn btn-gold">{pending ? "Submitting…" : "Submit application"}</button>}
        </div>
      </div>
    </form>
  );

  function label(f: string) {
    return (CONFIGURABLE_FIELDS as Record<string, string>)[f] ?? ({ firstName: "First name", lastName: "Surname", email: "Email", phone: "Mobile number" } as Record<string, string>)[f] ?? f;
  }
}

function groupBy<T>(list: T[], key: (t: T) => string) {
  return list.reduce<Record<string, T[]>>((acc, x) => ((acc[key(x)] ??= []).push(x), acc), {});
}
