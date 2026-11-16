-- Đồng bộ migration với schema.prisma (idempotent - an toàn khi chạy nối tiếp migration 20261027100000).

-- 1. Bảo đảm Enum Language có đủ ngôn ngữ Nhật và Trung
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'zh';

-- 2. Enum mới (idempotent)
DO $$ BEGIN
  CREATE TYPE "PassStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PoiStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Poi: bảo đảm có cột status DRAFT/PUBLISHED
ALTER TABLE "Poi" ADD COLUMN IF NOT EXISTS "status" "PoiStatus" NOT NULL DEFAULT 'PUBLISHED';

-- 4. Bảng mới (idempotent)
CREATE TABLE IF NOT EXISTS "AccessPass" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "tourId" TEXT,
  "status" "PassStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "deviceInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'admin',
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VisitorSession" (
  "visitorId" TEXT NOT NULL,
  "passCode" TEXT,
  "language" "Language" NOT NULL DEFAULT 'vi',
  "deviceInfo" TEXT,
  "lastActivePoiId" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isSpeaking" BOOLEAN NOT NULL DEFAULT false,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("visitorId")
);

-- 5. Index (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "AccessPass_code_key" ON "AccessPass"("code");
CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "VisitorSession_lastSeenAt_isActive_idx" ON "VisitorSession"("lastSeenAt", "isActive");
