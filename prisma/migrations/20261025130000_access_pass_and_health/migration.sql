-- Add access passes so a QR scan can create a time-limited visitor session.
CREATE TYPE "AccessPassStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "VisitEventType" AS ENUM ('POI_TRIGGERED', 'AUDIO_PLAYED', 'CHAT_ASKED');

ALTER TABLE "TourRoute" ADD COLUMN "qrCode" TEXT;
UPDATE "TourRoute" SET "qrCode" = "slug" WHERE "qrCode" IS NULL;
ALTER TABLE "TourRoute" ALTER COLUMN "qrCode" SET NOT NULL;
CREATE UNIQUE INDEX "TourRoute_qrCode_key" ON "TourRoute"("qrCode");

CREATE TABLE "AccessPass" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "language" VARCHAR(10) NOT NULL DEFAULT 'vi',
  "status" "AccessPassStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessPass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessPass_token_key" ON "AccessPass"("token");
CREATE INDEX "AccessPass_token_status_expiresAt_idx" ON "AccessPass"("token", "status", "expiresAt");
ALTER TABLE "AccessPass" ADD CONSTRAINT "AccessPass_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TourRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VisitEvent" (
  "id" TEXT NOT NULL,
  "accessPassId" TEXT NOT NULL,
  "poiId" TEXT,
  "type" "VisitEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VisitEvent_accessPassId_createdAt_idx" ON "VisitEvent"("accessPassId", "createdAt");
CREATE INDEX "VisitEvent_type_createdAt_idx" ON "VisitEvent"("type", "createdAt");
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_accessPassId_fkey"
  FOREIGN KEY ("accessPassId") REFERENCES "AccessPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_poiId_fkey"
  FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
