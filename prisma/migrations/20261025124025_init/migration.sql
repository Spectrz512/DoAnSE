-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "PoiStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poi" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "triggerRadiusM" INTEGER NOT NULL DEFAULT 35,
    "status" "PoiStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoiTranslation" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "audioUrl" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "PoiTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourRoute" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PoiStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "routeId" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("routeId","poiId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Poi_slug_key" ON "Poi"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PoiTranslation_poiId_language_key" ON "PoiTranslation"("poiId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "TourRoute_slug_key" ON "TourRoute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_position_key" ON "RouteStop"("routeId", "position");

-- AddForeignKey
ALTER TABLE "PoiTranslation" ADD CONSTRAINT "PoiTranslation_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TourRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
