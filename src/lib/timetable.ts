export type Slot = { id?: string; classGroupId: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null; lecturerId?: string | null; label?: string };

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** Two slots clash when they overlap on the same day and share a room, a lecturer or a class. */
export function findConflicts(candidate: Slot, existing: Slot[]) {
  const a0 = toMin(candidate.startTime), a1 = toMin(candidate.endTime);
  return existing.filter((e) => {
    if (e.id && e.id === candidate.id) return false;
    if (e.dayOfWeek !== candidate.dayOfWeek) return false;
    const b0 = toMin(e.startTime), b1 = toMin(e.endTime);
    if (!(a0 < b1 && b0 < a1)) return false;
    const sameRoom = !!candidate.room && !!e.room && candidate.room.toLowerCase() === e.room.toLowerCase() && candidate.room.toLowerCase() !== "online";
    const sameLecturer = !!candidate.lecturerId && candidate.lecturerId === e.lecturerId;
    const sameClass = candidate.classGroupId === e.classGroupId;
    return sameRoom || sameLecturer || sameClass;
  });
}

export function validTimes(start: string, end: string) {
  return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && toMin(end) > toMin(start);
}
