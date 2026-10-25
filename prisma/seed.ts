import { PoiStatus, PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@linhung.local" },
    update: {},
    create: {
      email: "admin@linhung.local",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  const mainGate = await prisma.poi.upsert({
    where: { slug: "main-gate" },
    update: {},
    create: {
      slug: "main-gate",
      latitude: 16.10699,
      longitude: 108.27354,
      triggerRadiusM: 40,
      status: PoiStatus.PUBLISHED,
      translations: {
        create: [
          {
            language: "vi",
            title: "Cổng chào Chùa Linh Ứng",
            description: "Điểm bắt đầu hành trình tham quan.",
          },
          {
            language: "en",
            title: "Linh Ung Pagoda Gate",
            description: "The starting point of your visit.",
          },
        ],
      },
    },
  });
  await prisma.tourRoute.upsert({
    where: { slug: "linh-ung-highlights" },
    update: {},
    create: {
      slug: "linh-ung-highlights",
      qrCode: "LINH-UNG-DEMO",
      status: PoiStatus.PUBLISHED,
      stops: { create: [{ poiId: mainGate.id, position: 1 }] },
    },
  });
}
main().finally(() => prisma.$disconnect());
