-- Đồng bộ migration với schema.prisma (migration init chỉ có 3 ngôn ngữ và thiếu nhiều bảng).

-- 1. Thêm ngôn ngữ Nhật và Trung
ALTER TYPE "Language" ADD VALUE 'ja';
ALTER TYPE "Language" ADD VALUE 'zh';

-- 2. Enum mới
CREATE TYPE "PassStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PoiStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- 3. Poi: thêm trạng thái DRAFT/PUBLISHED (POI cũ giữ nguyên là PUBLISHED)
ALTER TABLE "Poi" ADD COLUMN "status" "PoiStatus" NOT NULL DEFAULT 'PUBLISHED';

-- 4. Bảng mới
CREATE TABLE "AccessPass" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "tourId" TEXT,
  "status" "PassStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "deviceInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'admin',
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorSession" (
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

-- 5. Index
CREATE UNIQUE INDEX "AccessPass_code_key" ON "AccessPass"("code");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE INDEX "VisitorSession_lastSeenAt_isActive_idx" ON "VisitorSession"("lastSeenAt", "isActive");
