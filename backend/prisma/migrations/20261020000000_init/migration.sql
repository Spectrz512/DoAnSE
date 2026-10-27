CREATE TYPE "Language" AS ENUM ('vi', 'en', 'ko');
CREATE TYPE "ListeningMode" AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE "Poi" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL, "longitude" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL, "address" TEXT, "activationRadius" INTEGER NOT NULL DEFAULT 50,
  "priority" INTEGER NOT NULL DEFAULT 0, "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Poi_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Narration" (
  "id" TEXT NOT NULL, "poiId" TEXT NOT NULL, "language" "Language" NOT NULL,
  "title" TEXT NOT NULL, "content" TEXT NOT NULL, "audioUrl" TEXT, "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Narration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Narration_poiId_language_key" ON "Narration"("poiId", "language");
CREATE TABLE "Tour" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "isSuggested" BOOLEAN NOT NULL DEFAULT false,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TourStop" (
  "id" TEXT NOT NULL, "tourId" TEXT NOT NULL, "poiId" TEXT NOT NULL, "position" INTEGER NOT NULL,
  CONSTRAINT "TourStop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TourStop_tourId_position_key" ON "TourStop"("tourId", "position");
CREATE UNIQUE INDEX "TourStop_tourId_poiId_key" ON "TourStop"("tourId", "poiId");
CREATE TABLE "ListeningEvent" (
  "id" TEXT NOT NULL, "visitorId" TEXT, "poiId" TEXT NOT NULL, "language" "Language" NOT NULL,
  "mode" "ListeningMode" NOT NULL, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ListeningEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListeningEvent_visitorId_createdAt_idx" ON "ListeningEvent"("visitorId", "createdAt");
ALTER TABLE "Narration" ADD CONSTRAINT "Narration_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningEvent" ADD CONSTRAINT "ListeningEvent_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
