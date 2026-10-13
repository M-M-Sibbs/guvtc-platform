import { z } from "zod";

import { CONFIGURABLE_FIELDS, type ConfigurableField } from "./application-fields";
export * from "./application-fields";

const phone = z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Enter a valid phone number, e.g. +263 77 123 4567");
const opt = (max = 300) => z.string().trim().max(max).optional().or(z.literal(""));

export const baseApplicationSchema = z.object({
  courseId: z.string().min(1, "Choose a course"),
  intakeId: opt(),
  deliveryMode: opt(),
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your surname").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address — we send your reference here"),
  phone,
  address: opt(300),
  dateOfBirth: opt(20).refine((v) => !v || (!isNaN(Date.parse(v)) && new Date(v) < new Date()), "Enter a valid date of birth"),
  gender: opt(30),
  nationalId: opt(40),
  highestQualification: opt(120),
  results: opt(1000),
  priorTraining: opt(1000),
  experience: opt(1000),
  accessibility: opt(1000),
  emergencyName: opt(120),
  emergencyPhone: z.string().trim().max(20).optional().or(z.literal("")),
  consent: z.literal("on", { message: "Please confirm the declaration to submit" }),
});

export type ApplicationInput = z.infer<typeof baseApplicationSchema>;

/** Applies the admissions-configured required fields on top of the base schema. */
export function checkRequired(data: Record<string, unknown>, required: ConfigurableField[], files: Record<string, number>) {
  const errors: Record<string, string> = {};
  for (const f of required) {
    if (f.startsWith("doc_")) {
      if (!files[f]) errors[f] = `${CONFIGURABLE_FIELDS[f]} is required`;
    } else if (!data[f] || String(data[f]).trim() === "") {
      errors[f] = `${CONFIGURABLE_FIELDS[f]} is required`;
    }
  }
  if (data.emergencyPhone && !/^[+0-9 ()-]{7,20}$/.test(String(data.emergencyPhone))) errors.emergencyPhone = "Enter a valid phone number";
  return errors;
}

