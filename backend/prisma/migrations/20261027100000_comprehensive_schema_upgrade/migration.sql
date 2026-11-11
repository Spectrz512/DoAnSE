-- 1. Mở rộng Enum Language với 15 ngôn ngữ mới
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'zh_TW';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'lo';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'km';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'id';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'ms';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'fil';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'hi';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'ar';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'ru';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'pt';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'it';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'es';

-- 2. Tạo Enum ListeningStatus
DO $$ BEGIN
  CREATE TYPE "ListeningStatus" AS ENUM ('PREPARING', 'PLAYING', 'COMPLETED', 'ERROR', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Tạo Enum AccessSource
DO $$ BEGIN
  CREATE TYPE "AccessSource" AS ENUM ('QR', 'DIRECT', 'MAP', 'TOUR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Bảng danh mục 20 ngôn ngữ
CREATE TABLE IF NOT EXISTS "LanguageCatalog" (
  "code" TEXT NOT NULL,
  "nameVi" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "flagEmoji" TEXT NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LanguageCatalog_pkey" PRIMARY KEY ("code")
);
CREATE INDEX IF NOT EXISTS "LanguageCatalog_isAvailable_idx" ON "LanguageCatalog"("isAvailable");
CREATE INDEX IF NOT EXISTS "LanguageCatalog_sortOrder_idx" ON "LanguageCatalog"("sortOrder");

-- 5. Cập nhật bảng ListeningEvent với các cột trạng thái nghe và thời lượng
ALTER TABLE "ListeningEvent" ADD COLUMN IF NOT EXISTS "status" "ListeningStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "ListeningEvent" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER DEFAULT 0;
ALTER TABLE "ListeningEvent" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ListeningEvent" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "ListeningEvent" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

CREATE INDEX IF NOT EXISTS "ListeningEvent_poiId_createdAt_idx" ON "ListeningEvent"("poiId", "createdAt");
CREATE INDEX IF NOT EXISTS "ListeningEvent_language_createdAt_idx" ON "ListeningEvent"("language", "createdAt");
CREATE INDEX IF NOT EXISTS "ListeningEvent_status_idx" ON "ListeningEvent"("status");
CREATE INDEX IF NOT EXISTS "ListeningEvent_startedAt_idx" ON "ListeningEvent"("startedAt");

-- 6. Bảng theo dõi phiên nghe trực tiếp (ListeningSession)
CREATE TABLE IF NOT EXISTS "ListeningSession" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "poiId" TEXT NOT NULL,
  "language" "Language" NOT NULL,
  "mode" "ListeningMode" NOT NULL DEFAULT 'AUTO',
  "status" "ListeningStatus" NOT NULL DEFAULT 'PLAYING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListeningSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ListeningSession_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ListeningSession_visitorId_idx" ON "ListeningSession"("visitorId");
CREATE INDEX IF NOT EXISTS "ListeningSession_status_idx" ON "ListeningSession"("status");
CREATE INDEX IF NOT EXISTS "ListeningSession_lastHeartbeatAt_status_idx" ON "ListeningSession"("lastHeartbeatAt", "status");
CREATE INDEX IF NOT EXISTS "ListeningSession_poiId_idx" ON "ListeningSession"("poiId");

-- 7. Bảng ghi nhận lượt truy cập (AccessEvent)
CREATE TABLE IF NOT EXISTS "AccessEvent" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceType" TEXT DEFAULT 'Mobile',
  "language" "Language" NOT NULL DEFAULT 'vi',
  "poiId" TEXT,
  "source" "AccessSource" NOT NULL DEFAULT 'DIRECT',
  "path" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccessEvent_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AccessEvent_createdAt_idx" ON "AccessEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AccessEvent_visitorId_idx" ON "AccessEvent"("visitorId");
CREATE INDEX IF NOT EXISTS "AccessEvent_poiId_idx" ON "AccessEvent"("poiId");
CREATE INDEX IF NOT EXISTS "AccessEvent_language_idx" ON "AccessEvent"("language");
CREATE INDEX IF NOT EXISTS "AccessEvent_source_idx" ON "AccessEvent"("source");

-- 8. Bảng quản lý mã QR (QrCode)
CREATE TABLE IF NOT EXISTS "QrCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "targetPoiId" TEXT,
  "targetTourId" TEXT,
  "defaultLang" "Language" NOT NULL DEFAULT 'vi',
  "label" TEXT,
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "lastScannedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrCode_targetPoiId_fkey" FOREIGN KEY ("targetPoiId") REFERENCES "Poi"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "QrCode_code_key" ON "QrCode"("code");
CREATE INDEX IF NOT EXISTS "QrCode_targetPoiId_idx" ON "QrCode"("targetPoiId");
CREATE INDEX IF NOT EXISTS "QrCode_code_idx" ON "QrCode"("code");

-- 9. Thêm các Index tối ưu hóa truy vấn cho Poi, Tour, Narration, AccessPass
CREATE INDEX IF NOT EXISTS "Poi_status_idx" ON "Poi"("status");
CREATE INDEX IF NOT EXISTS "Poi_priority_idx" ON "Poi"("priority");
CREATE INDEX IF NOT EXISTS "Poi_category_idx" ON "Poi"("category");
CREATE INDEX IF NOT EXISTS "Narration_language_idx" ON "Narration"("language");
CREATE INDEX IF NOT EXISTS "Narration_poiId_idx" ON "Narration"("poiId");
CREATE INDEX IF NOT EXISTS "Tour_isSuggested_idx" ON "Tour"("isSuggested");
CREATE INDEX IF NOT EXISTS "TourStop_tourId_idx" ON "TourStop"("tourId");
CREATE INDEX IF NOT EXISTS "TourStop_poiId_idx" ON "TourStop"("poiId");
CREATE INDEX IF NOT EXISTS "AccessPass_status_idx" ON "AccessPass"("status");
CREATE INDEX IF NOT EXISTS "AccessPass_expiresAt_idx" ON "AccessPass"("expiresAt");
