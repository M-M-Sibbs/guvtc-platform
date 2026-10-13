// Plain constants (no validation library) so the client bundle stays small.
// Fields Admissions can switch between "required" and "optional" (Staff → Settings).
export const CONFIGURABLE_FIELDS = {
  address: "Residential address",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  nationalId: "National ID / passport number",
  highestQualification: "Highest qualification",
  emergencyName: "Emergency contact name",
  emergencyPhone: "Emergency contact phone",
  doc_id: "Copy of ID document (upload)",
  doc_certificate: "Certificate / results (upload)",
} as const;
export type ConfigurableField = keyof typeof CONFIGURABLE_FIELDS;
export const DEFAULT_REQUIRED: ConfigurableField[] = ["address", "nationalId", "emergencyName", "emergencyPhone", "doc_id"];

export const DOC_TYPES = {
  doc_id: "National ID or passport",
  doc_certificate: "Certificates or results",
  doc_photo: "Passport-size photo",
  doc_other: "Other supporting document",
} as const;

export const STEP_FIELDS: string[][] = [
  ["courseId", "intakeId", "deliveryMode"],
  ["firstName", "lastName", "email", "phone", "address", "dateOfBirth", "gender", "nationalId"],
  ["highestQualification", "results", "priorTraining", "experience", "accessibility", "emergencyName", "emergencyPhone"],
  ["doc_id", "doc_certificate", "doc_photo", "doc_other"],
  ["consent"],
];
