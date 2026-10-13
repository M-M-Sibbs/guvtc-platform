import "server-only";
import { db, schema } from "@/db";

export async function audit(
  actor: { id: string; name: string } | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>,
) {
  await db.insert(schema.auditLogs).values({
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "Public",
    action, entity, entityId: entityId ?? null, meta: meta ?? null,
  });
}
