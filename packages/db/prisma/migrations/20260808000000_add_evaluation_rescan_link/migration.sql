-- §10-Fase 4: enlaza un rescan con la evaluación que lo originó. Opcional
-- (la inmensa mayoría de evaluaciones no son un rescan de nada) y ON DELETE
-- SET NULL porque nada en este proyecto borra evaluaciones, pero un rescan
-- no debería volverse inválido si alguna vez ocurriera.
ALTER TABLE "evaluations" ADD COLUMN "rescanOfEvaluationId" TEXT;

CREATE INDEX "evaluations_rescanOfEvaluationId_idx" ON "evaluations"("rescanOfEvaluationId");

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rescanOfEvaluationId_fkey" FOREIGN KEY ("rescanOfEvaluationId") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
