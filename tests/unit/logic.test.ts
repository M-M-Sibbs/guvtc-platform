import { describe, expect, it } from "vitest";
import { computeFinal, gradeFor } from "../../src/lib/grading";
import { invoiceBalance, statusFor } from "../../src/lib/finance";
import { findConflicts, validTimes } from "../../src/lib/timetable";
import { newReference } from "../../src/lib/reference";
import { can } from "../../src/lib/permissions";

describe("grading", () => {
  it("weights components", () => {
    expect(computeFinal([{ weight: 30, maxMarks: 50, marks: 41, status: "RECORDED" }, { weight: 70, maxMarks: 100, marks: 72, status: "RECORDED" }])).toBe(75)
  });
  it("counts absent as zero and blocks withheld", () => {
    expect(computeFinal([{ weight: 50, maxMarks: 100, marks: null, status: "ABSENT" }, { weight: 50, maxMarks: 100, marks: 80, status: "RECORDED" }])).toBe(40);
    expect(computeFinal([{ weight: 100, maxMarks: 100, marks: 90, status: "WITHHELD" }])).toBeNull();
  });
  it("maps bands", () => {
    expect(gradeFor(75).grade).toBe("Distinction");
    expect(gradeFor(49.9).grade).toBe("Not yet competent");
  });
});

describe("finance", () => {
  it("ignores pending and reversed payments", () => {
    const b = invoiceBalance({ amount: "120.00", concession: "20.00", payments: [{ amount: "50", status: "CONFIRMED" }, { amount: "30", status: "PENDING" }, { amount: "10", status: "REVERSED" }] });
    expect(b).toMatchObject({ net: 100, confirmed: 50, pending: 30, balance: 50 });
    expect(statusFor(b.net, b.confirmed)).toBe("PART_PAID");
    expect(statusFor(100, 100)).toBe("PAID");
  });
});

describe("timetable", () => {
  const existing = [{ id: "a", classGroupId: "g1", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", room: "Lab 1", lecturerId: "L1" }];
  it("detects room, lecturer and class clashes", () => {
    expect(findConflicts({ classGroupId: "g2", dayOfWeek: 1, startTime: "09:00", endTime: "11:00", room: "lab 1", lecturerId: "L2" }, existing)).toHaveLength(1);
    expect(findConflicts({ classGroupId: "g2", dayOfWeek: 1, startTime: "09:00", endTime: "11:00", room: "Lab 2", lecturerId: "L1" }, existing)).toHaveLength(1);
    expect(findConflicts({ classGroupId: "g2", dayOfWeek: 1, startTime: "10:00", endTime: "11:00", room: "Lab 1", lecturerId: "L1" }, existing)).toHaveLength(0);
    expect(findConflicts({ classGroupId: "g2", dayOfWeek: 2, startTime: "08:00", endTime: "10:00", room: "Lab 1", lecturerId: "L1" }, existing)).toHaveLength(0);
  });
  it("validates times", () => { expect(validTimes("10:00", "09:00")).toBe(false); });
});

describe("references and permissions", () => {
  it("generates readable references", () => { expect(newReference("GUV", new Date("2026-10-13"))).toMatch(/^GUV-26-[A-HJ-NP-Z2-9]{6}$/); });
  it("keeps marketing away from marks and finance", () => {
    expect(can("MARKETING", "ads.manage")).toBe(true);
    expect(can("MARKETING", "marks.enter")).toBe(false);
    expect(can("MARKETING", "finance.manage")).toBe(false);
    expect(can("LECTURER", "results.publish")).toBe(false);
    expect(can("STUDENT", "dashboard.view")).toBe(false);
  });
});
