-- Not expressible in schema.prisma (Prisma's DSL has no partial-index
-- syntax) — see the comment on Evaluation.requesterIpHash. `prisma migrate
-- dev` only diffs against schema.prisma, so it won't try to drop this.
CREATE UNIQUE INDEX "evaluations_one_active_per_ip" ON "evaluations"("requesterIpHash") WHERE "status" IN ('queued', 'running');
