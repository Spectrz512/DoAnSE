/**
 * ==============================================================================
 * SÀI GÒN DI SẢN – KỊCH BẢN NẠP DỮ LIỆU MẪU BAN ĐẦU (DATABASE SEED SCRIPT)
 * ==============================================================================
 * Kịch bản thực thi tuần tự gồm các bước:
 * 1. Dọn sạch dữ liệu di tích cũ ngoài TP.HCM để đồng bộ 100% tại Sài Gòn.
 * 2. Nạp danh mục 20 ngôn ngữ quốc tế chuẩn ISO vào bảng LanguageCatalog.
 * 3. Nạp 13 điểm di tích lịch sử Sài Gòn (Dinh Độc Lập, Bến Thành, Nhà Rồng, v.v.).
 * 4. Nạp 260 bản thuyết minh (13 POIs x 20 ngôn ngữ) vào bảng Narration.
 * 5. Thiết lập 3 lộ trình Tour chuyên gia gợi ý kèm các điểm dừng TourStop.
 * 6. Khởi tạo mã vé mẫu AccessPass (hạn dùng 72h) và các phiên nghe mô phỏng.
 * ==============================================================================
 */

import {
  AccessSource,
  Language,
  ListeningMode,
  ListeningStatus,
  PassStatus,
  PoiStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/linh_ung?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("🌱 Seeding database...");

  // 0. Xóa sạch triệt để các POI, Tour và dữ liệu liên quan đến Đà Nẵng cũ (Đồng bộ 100% TP.HCM)
  await prisma.tourStop.deleteMany({
    where: {
      OR: [
        { tourId: 'linh-ung-panoramic' },
        { poiId: { startsWith: 'chua-linh-ung' } },
      ],
    },
  });
  await prisma.tour.deleteMany({
    where: { id: 'linh-ung-panoramic' },
  });
  await prisma.listeningSession.deleteMany({
    where: { poiId: { startsWith: 'chua-linh-ung' } },
  });
  await prisma.listeningEvent.deleteMany({
    where: { poiId: { startsWith: 'chua-linh-ung' } },
  });
  await prisma.accessEvent.deleteMany({
    where: {
      OR: [
        { poiId: { startsWith: 'chua-linh-ung' } },
        { path: { contains: 'linh-ung' } },
      ],
    },
  });
  await prisma.narration.deleteMany({
    where: { poiId: { startsWith: 'chua-linh-ung' } },
  });
  await prisma.poi.deleteMany({
    where: { id: { startsWith: 'chua-linh-ung' } },
  });
  console.log("🧹 Đã dọn sạch 100% dữ liệu di tích cũ ngoài TP.HCM.");

  // 1. Tạo sẵn danh sách AccessPass mặc định (ACTIVE, hạn dùng 30 ngày)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const accessPasses = [
    { code: "DEMO-2026", tourId: null, activatedAt: new Date(Date.now() - 2 * 3600 * 1000), deviceInfo: "iPhone 15 Pro - Safari" },
    { code: "TOUR-SAIGON-2026", tourId: "saigon-highlights", activatedAt: new Date(Date.now() - 24 * 3600 * 1000), deviceInfo: "Samsung S24 - Chrome" },
    { code: "PASS-VIP-2026", tourId: "saigon-heritage-walk", activatedAt: null, deviceInfo: null },
  ];
  for (const pass of accessPasses) {
    await prisma.accessPass.upsert({
      where: { code: pass.code },
      update: {
        status: PassStatus.ACTIVE,
        expiresAt,
        tourId: pass.tourId,
      },
      create: {
        code: pass.code,
        tourId: pass.tourId,
        status: PassStatus.ACTIVE,
        expiresAt,
        activatedAt: pass.activatedAt,
        deviceInfo: pass.deviceInfo,
      },
    });
  }
  console.log(`✅ Seeded ${accessPasses.length} AccessPasses (DEMO-2026, TOUR-SAIGON-2026, PASS-VIP-2026).`);

  // 2. Danh sách 5 POI Di Tích & Văn Hóa Bổ Sung tại TP.HCM (Đủ 13 POI 100% Sài Gòn)
  const saigonExtraPois = [
    {
      id: "chua-ngoc-hoang",
      name: "Chùa Ngọc Hoàng (Phước Hải Tự)",
      category: "temple",
      address: "73 Mai Thị Lựu, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
      latitude: 10.7919,
      longitude: 106.6983,
      activationRadius: 45,
      priority: 8,
      description: "Ngôi chùa cổ kính hơn một thế kỷ với kiến trúc Đạo giáo độc đáo và tượng gỗ điêu khắc tinh xảo từng đón tiếp Tổng thống Barack Obama.",
      narrations: [
        {
          language: Language.vi,
          title: "Chùa Ngọc Hoàng (Phước Hải Tự)",
          content: "Chào mừng quý khách đến với Chùa Ngọc Hoàng, tên chữ là Phước Hải Tự, tọa lạc tại đường Mai Thị Lựu, Quận 1. Ngôi chùa được xây dựng vào đầu thế kỷ 20 theo kiến trúc Đạo giáo Trung Hoa đặc trưng với mái ngói âm dương, các tượng thờ bằng gỗ chạm khắc sống động và hồ rùa phóng sinh thanh bình. Nơi đây từng vinh dự đón tiếp Tổng thống Hoa Kỳ Barack Obama trong chuyến thăm chính thức năm 2016."
        },
        {
          language: Language.en,
          title: "Jade Emperor Pagoda (Phuoc Hai Tu)",
          content: "Welcome to the Jade Emperor Pagoda (Phuoc Hai Tu), located on Mai Thi Luu Street in District 1. Built in the early 20th century, this atmospheric Taoist temple features intricate wood carvings, smoky incense-filled chambers, and serene tortoise ponds. It gained international prominence during US President Barack Obama's historic visit in 2016."
        },
        {
          language: Language.ko,
          title: "옥황사 (푸옥하이 뜨)",
          content: "호치민 1군 마이티루 거리에 위치한 옥황사(푸옥하이 사원)에 오신 것을 환영합니다. 20세기 초에 건립된 유서 깊은 도교 사원으로, 정교한 목조 조각과 피어오르는 향 연기, 평화로운 거북이 연못이 인상적입니다. 2016년 버락 오바마 전 미국 대통령이 방문하여 더욱 널리 알려졌습니다."
        },
        {
          language: Language.ja,
          title: "玉皇殿（フックハイ寺）",
          content: "ホーチミン市1区マイティールー通りに佇む玉皇殿（フックハイ寺）へようこそ。20世紀初頭に建立された道教寺院で、緻密な木彫りの神像や線香の煙が神秘的な雰囲気を醸し出しています。2016年にはオバマ元米大統領も参拝に訪れました。"
        },
        {
          language: Language.zh,
          title: "玉皇殿（福海寺）",
          content: "欢迎莅临位于第一郡梅氏琉街的玉皇殿（福海寺）。这座建于20世纪初的古刹融合了岭南道教建筑精华，殿内供奉玉皇大帝与各路仙真，木雕神像栩栩如生，香火缭绕。2016年美国前总统奥巴马访越期间曾专程到此参访。"
        }
      ]
    },
    {
      id: "bao-tang-my-thuat",
      name: "Bảo tàng Mỹ thuật TP. Hồ Chí Minh",
      category: "museum",
      address: "97A Phó Đức Chính, Phường Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh",
      latitude: 10.7699,
      longitude: 106.6994,
      activationRadius: 45,
      priority: 8,
      description: "Tòa dinh thự giao thoa giữa kiến trúc Art Deco phương Tây và hoa văn Á Đông, từng là tư gia của thương nhân Hứa Bổn Hòa (Chú Hỏa).",
      narrations: [
        {
          language: Language.vi,
          title: "Bảo tàng Mỹ thuật TP. Hồ Chí Minh",
          content: "Chào mừng quý khách đến với Bảo tàng Mỹ thuật TP. Hồ Chí Minh, tọa lạc tại số 97A Phó Đức Chính. Tòa dinh thự tráng lệ này kết hợp hài hòa giữa phong cách Art Deco của Pháp và kiến trúc truyền thống phương Đông, nổi bật với hệ thống thang máy cổ kính, sàn lát gạch hoa tinh xảo và các tác phẩm hội họa, điêu khắc vô giá của nền mỹ thuật Việt Nam qua các thời kỳ."
        },
        {
          language: Language.en,
          title: "Ho Chi Minh City Fine Arts Museum",
          content: "Welcome to the Ho Chi Minh City Museum of Fine Arts at 97A Pho Duc Chinh. Formerly the grand residence of merchant Hui Bon Hoa, this yellow mansion is an architectural masterpiece harmonizing French Art Deco elegance with classical Chinese motifs, housing precious collections of Vietnamese paintings and sculptures."
        },
        {
          language: Language.ko,
          title: "호치민 시립 미술관",
          content: "포득찐 거리에 위치한 호치민 시립 미술관에 오신 것을 환영합니다. 과거 거상 후아본호아의 대저택이었던 이 건물은 프랑스 아르데코 양식과 동양적 미학이 절묘하게 조화된 건축물로, 베트남 근현대 회화와 조각 예술의 걸작들을 소장하고 있습니다."
        },
        {
          language: Language.ja,
          title: "ホーチミン市美術館",
          content: "1区フォードゥックチン通りに位置するホーチミン市美術館へようこそ。旧富豪フア・ボン・ホア氏の邸宅であったこの美しい黄色い洋館は、アールデコ調と東洋装飾が融合した傑作建築で、ベ트ナム屈指の絵画や彫刻コレクションを鑑賞できます。"
        },
        {
          language: Language.zh,
          title: "胡志明市美术馆",
          content: "欢迎莅临位于第一郡副德政街97A号的胡志明市美术馆。该馆原为西贡华人巨商黄文华（许本和）家族的宏伟豪宅，融汇了法国装饰艺术与岭南建筑风格，黄色外墙与典雅回廊间珍藏着数千件越南国宝级现当代美术作品。"
        }
      ]
    },
    {
      id: "ho-con-rua",
      name: "Hồ Con Rùa (Công trường Quốc Tế)",
      category: "monument",
      address: "Công trường Quốc Tế, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh",
      latitude: 10.7827,
      longitude: 106.6959,
      activationRadius: 40,
      priority: 7,
      description: "Vòng xoay đài phun nước biểu tượng giữa trung tâm Sài Gòn, giao điểm giữa các con đường rợp bóng cây cổ thụ và điểm hẹn văn hóa đường phố.",
      narrations: [
        {
          language: Language.vi,
          title: "Hồ Con Rùa (Công trường Quốc Tế)",
          content: "Trước mắt bạn là Hồ Con Rùa, tên chính thức là Công trường Quốc Tế, vòng xoay giao thông và không gian công cộng đặc sắc tại ranh giới Quận 1 và Quận 3. Đài phun nước được thiết kế với hình tượng cánh hoa xòe nở trên hồ nước, bao quanh bởi những hàng me cổ thụ xanh mát. Đây là điểm hẹn quen thuộc của giới trẻ Sài Gòn với văn hóa ẩm thực đường phố sôi động."
        },
        {
          language: Language.en,
          title: "Turtle Lake (International Square)",
          content: "Standing before you is Turtle Lake, officially named International Square, an iconic roundabout fountain connecting District 1 and District 3. Designed in the late 1960s with flower petal spires over a reflective pond, it is surrounded by shaded tamarind trees and serves as a beloved hub for local street food and social life."
        },
        {
          language: Language.ko,
          title: "호꼰루아 (거북이 호수 / 국제광장)",
          content: "1군과 3군의 경계에 위치한 대표적인 로터리 분수대인 호꼰루아(국제광장)입니다. 연꽃 꽃잎 형상의 기둥 구조물과 시원한 분수가 어우러져 있으며, 고목들이 드리운 그늘 아래에서 다양한 사이공 길거리 간식을 즐길 수 있는 젊음의 명소입니다."
        },
        {
          language: Language.ja,
          title: "亀の池（コンチュオン・クオック・テー）",
          content: "1区と3区の交差点に位置するラウンドアバウト型噴水池「亀の池（国際広場）」です。花びらをかたどった柱塔と緑豊かな並木に囲まれ、夕方には多くの若者が集い、ローカルな屋台グルメを楽しむ憩いの場となっています。"
        },
        {
          language: Language.zh,
          title: "乌龟湖（国际广场）",
          content: "您眼前的是俗称“乌龟湖”的国际广场环岛喷泉，坐落于第一郡与第三郡交界处。中央喷泉立柱如花瓣般绽放，环湖绿树成荫。这里不仅是西贡地标性公共空间，更是品尝越式街头小吃与感受都市慢调生活的绝佳去处。"
        }
      ]
    },
    {
      id: "thao-cam-vien",
      name: "Thảo Cầm Viên Sài Gòn",
      category: "park",
      address: "02 Nguyễn Bỉnh Khiêm, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      latitude: 10.7876,
      longitude: 106.7052,
      activationRadius: 50,
      priority: 7,
      description: "Một trong những vườn thú - thực vật lâu đời nhất thế giới xây dựng từ năm 1864, lá phổi xanh giữa lòng đô thị với hàng ngàn cây cổ thụ và động thực vật quý hiếm.",
      narrations: [
        {
          language: Language.vi,
          title: "Thảo Cầm Viên Sài Gòn",
          content: "Chào mừng quý khách đến với Thảo Cầm Viên Sài Gòn tại số 2 Nguyễn Bỉnh Khiêm, Quận 1. Được thành lập vào năm 1864 bởi nhà thực vật học người Pháp Jean-Baptiste Louis Pierre, đây là một trong tám vườn thú lâu đời nhất thế giới còn hoạt động. Không gian xanh mát rộng lớn này bảo tồn hàng nghìn cây cổ thụ quý hiếm cùng hàng trăm loài động thực vật nhiệt đới."
        },
        {
          language: Language.en,
          title: "Saigon Zoo and Botanical Gardens",
          content: "Welcome to the Saigon Zoo and Botanical Gardens at 2 Nguyen Binh Khiem. Established in 1864, it is among the oldest continually operating botanical and zoological parks in the world. This lush 20-hectare green sanctuary preserves centuries-old heritage trees and an impressive diversity of tropical flora and wildlife."
        },
        {
          language: Language.ko,
          title: "사이공 동물원 및 식물원",
          content: "1군 응우옌빈키엠 거리에 위치한 사이공 동식물원에 오신 것을 환영합니다. 1864년에 개원하여 전 세계에서 가장 오래된 동식물원 중 하나로 손꼽힙니다. 도심 속 거대한 녹지 공간으로 백년이 넘은 고목들과 희귀 열대 동식물을 품고 있는 사이공의 녹색 쉼터입니다."
        },
        {
          language: Language.ja,
          title: "サイゴン動植物園",
          content: "1区グエン・ビン・キエム通りに位置するサイゴン動植物園へようこそ。1864年に開園した世界最古級の動植物園の一つです。樹齢100年を超える巨木が茂る緑豊かな園内は、都会の喧騒を離れて熱帯の豊かな自然と動物たちに触れ合えるオアシスです。"
        },
        {
          language: Language.zh,
          title: "西贡动植物园",
          content: "欢迎莅临位于第一郡阮秉谦街2号的西贡动植物园。该园始建于1864年，是全球历史最悠久的动植物园之一。园区内古木参天、繁花似锦，不仅是一座绿意盎然的都市森林氧吧，更守护着众多濒危热带动物与珍稀植物标本。"
        }
      ]
    },
    {
      id: "ben-bach-dang",
      name: "Công viên Bến Bạch Đằng & Cột Cờ Thủ Ngữ",
      category: "park",
      address: "Đường Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      latitude: 10.7711,
      longitude: 106.7063,
      activationRadius: 50,
      priority: 8,
      description: "Bến cảng lịch sử bên bờ sông Sài Gòn cùng Cột cờ Thủ Ngữ hơn 150 năm tuổi, nơi ngắm cảnh sông nước hoa lệ và lưu giữ ký ức đô thị bến cảng.",
      narrations: [
        {
          language: Language.vi,
          title: "Công viên Bến Bạch Đằng & Cột Cờ Thủ Ngữ",
          content: "Chào mừng quý khách đến với Công viên Bến Bạch Đằng bên bờ sông Sài Gòn thơ mộng. Tại đây có di tích Cột cờ Thủ Ngữ được xây dựng từ năm 1865, từng là cột cờ tín hiệu điều phối tàu bè ra vào thương cảng Sài Gòn. Ngày nay, công viên là không gian đi bộ ngắm toàn cảnh sông Sài Gòn và khu đô thị mới Thủ Thiêm hiện đại bên kia bờ sông."
        },
        {
          language: Language.en,
          title: "Bach Dang Wharf Park & Thu Ngu Flagpole",
          content: "Welcome to Bach Dang Wharf Park along the Saigon River. At the southern promenade stands the historic Thu Ngu Flagpole, erected in 1865 as a naval signal mast guiding incoming vessels to port. Today, the landscaped waterfront offers sweeping panoramic views of the river and the emerging Thu Thiem skyline."
        },
        {
          language: Language.ko,
          title: "박당 부두 공원 & 투응우 국기게양대",
          content: "사이공 강변을 따라 조성된 박당 부두 공원에 오신 것을 환영합니다. 1865년에 세워진 유서 깊은 투응우 국기게양대는 과거 사이공 항구로 들어오는 선박들에게 신호를 보내던 신호탑이었습니다. 시원한 강바람과 함께 맞은편 투티엠 신도시의 현대적인 스카이라인을 조망할 수 있습니다."
        },
        {
          language: Language.ja,
          title: "バクダン埠頭公園＆トゥーグー旗塔",
          content: "サイゴン川沿いに広がるバクダン埠頭公園へようこそ。敷地内には1865年に設置された歴史的記念物「トゥーグー旗塔」があり、かつて港を行き交う船へ信号を送る役割を担っていました。対岸のトゥーティエム新都心のパノラマ夜景が望める人気の散策地です。"
        },
        {
          language: Language.zh,
          title: "白藤码头公园与守语旗台",
          content: "欢迎光临坐落于西贡河畔的白藤码头公园。公园南端的“守语旗台”建于1865年，曾是引领各国商船进出西贡海港的信号标志塔。今日修缮一新的滨河步道风景如画，是远眺对岸首添新城区现代化天际线与感受西贡水运繁荣的绝佳视点。"
        }
      ]
    }
  ];

  // 3. Danh sách 8 POI Sài Gòn với 5 ngôn ngữ
  const saigonPois = [
    {
      id: "dinh-doc-lap",
      name: "Dinh Độc Lập",
      category: "culture",
      address: "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1",
      latitude: 10.7770,
      longitude: 106.6953,
      activationRadius: 50,
      priority: 10,
      description: "Biểu tượng lịch sử quan trọng của Sài Gòn, kiệt tác kiến trúc của KTS Ngô Viết Thụ.",
      narrations: [
        {
          language: Language.vi,
          title: "Dinh Độc Lập",
          content: "Chào mừng bạn đến với Dinh Độc Lập, di tích lịch sử quốc gia đặc biệt tại trung tâm Thành phố Hồ Chí Minh. Công trình do kiến trúc sư Ngô Viết Thụ thiết kế, kết hợp hài hòa giữa triết lý phương Đông và phong cách hiện đại. Nơi đây từng là nơi làm việc của Tổng thống Việt Nam Cộng hòa và chứng kiến ngày thống nhất đất nước 30 tháng 4 năm 1975."
        },
        {
          language: Language.en,
          title: "Independence Palace",
          content: "Welcome to Independence Palace, a special national historical landmark in the heart of Ho Chi Minh City. Designed by architect Ngo Viet Thu, it harmoniously blends Eastern philosophy with modernist architecture. This site witnessed the historic reunification of Vietnam on April 30, 1975."
        },
        {
          language: Language.ko,
          title: "통일궁",
          content: "호치민시 중심부에 위치한 특별 국가 역사 유적지인 통일궁에 오신 것을 환영합니다. 건축가 응오 비엣 투가 설계하였으며, 동양 철학과 현대 건축 양식이 조화를 이루고 있습니다. 1975년 4월 30일 베트남 통일의 역사적 현장입니다."
        },
        {
          language: Language.ja,
          title: "統一会堂",
          content: "ホーチミン市中心部に位置する国家特別歴史遺跡、統一会堂へようこそ。建築家ヴォ・ヴィエット・トゥによって設計され、東洋の哲学と現代建築が見事に調和しています。1975年4月30日の歴史的な南北統一の舞台となりました。"
        },
        {
          language: Language.zh,
          title: "统一宫",
          content: "欢迎来到位于胡志明市中心的国家级特别历史遗迹——统一宫。这座建筑由建筑大师吴日秋设计，巧妙融合了东方哲学与现代主义风格，见证了1975年4月30日国家统一的历史时刻。"
        }
      ]
    },
    {
      id: "nha-tho-duc-ba",
      name: "Nhà thờ Đức Bà Sài Gòn",
      category: "temple",
      address: "01 Công xã Paris, Phường Bến Nghé, Quận 1",
      latitude: 10.7798,
      longitude: 106.6990,
      activationRadius: 45,
      priority: 9,
      description: "Kiệt tác kiến trúc Romanesque kết hợp Gothic tráng lệ với hai tháp chuông cao 58m xây bằng gạch Marseille.",
      narrations: [
        {
          language: Language.vi,
          title: "Nhà thờ Đức Bà Sài Gòn",
          content: "Vương cung Thánh đường Chính tòa Đức Mẹ Vô nhiễm Nguyên tội được xây dựng từ năm 1877 đến 1880. Toàn bộ gạch đỏ xây dựng đều được vận chuyển trực tiếp từ cảng Marseille nước Pháp. Hai tháp chuông cao 58 mét vươn thẳng lên nền trời, là biểu tượng tôn giáo và kiến trúc độc đáo bậc nhất Sài Gòn."
        },
        {
          language: Language.en,
          title: "Notre-Dame Cathedral Basilica of Saigon",
          content: "Built between 1877 and 1880, all exterior red bricks were shipped directly from Marseille, France. Its twin bell towers soar 58 meters into the sky, serving as one of Saigon's most recognizable architectural and religious icons."
        },
        {
          language: Language.ko,
          title: "사이공 노트르담 대성당",
          content: "1877년부터 1880년 사이에 건축된 이 성당의 외벽 붉은 벽돌은 전량 프랑스 마르세유에서 직접 운송되었습니다. 58미터 높이의 쌍둥이 종탑은 사이공의 가장 상징적인 종교 및 건축 랜드마크입니다."
        },
        {
          language: Language.ja,
          title: "サイゴン・ノートルダム大聖堂",
          content: "1877年から1880年にかけて建設され、外壁の赤レンガはすべてフランスのマルセイユから運ばれました。高さ58メートルの二塔の鐘楼が空高くそびえ立ち、サイゴン屈指の歴史的建築物です。"
        },
        {
          language: Language.zh,
          title: "西贡圣母大教堂",
          content: "建于1877年至1880年间，整座教堂的外墙红砖均由法国马赛直接海运而来。高达58米的一对双钟楼耸立于城市天际线，是西贡最具代表性的宗教与建筑地标。"
        }
      ]
    },
    {
      id: "buu-dien-trung-tam",
      name: "Bưu điện Trung tâm Sài Gòn",
      category: "culture",
      address: "02 Công xã Paris, Phường Bến Nghé, Quận 1",
      latitude: 10.7799,
      longitude: 106.6999,
      activationRadius: 40,
      priority: 8,
      description: "Công trình giao thoa kiến trúc phương Tây và Á Đông với mái vòm sắt uốn cong tinh xảo.",
      narrations: [
        {
          language: Language.vi,
          title: "Bưu điện Trung tâm Sài Gòn",
          content: "Nằm kế bên Nhà thờ Đức Bà, Bưu điện Trung tâm được xây dựng vào cuối thế kỷ 19 theo đồ án của kiến trúc sư Villedieu và Foulhoux. Công trình nổi tiếng với vòm kim loại uốn cong tinh xảo, sàn gạch hoa cổ điển và hai bản đồ lịch sử vẽ tay công phu."
        },
        {
          language: Language.en,
          title: "Saigon Central Post Office",
          content: "Located right next to Notre-Dame Cathedral, this grand post office was built in the late 19th century by French architects Villedieu and Foulhoux. It is renowned for its arched metal ceiling, patterned tile floors, and historic hand-painted wall maps."
        },
        {
          language: Language.ko,
          title: "사이공 중앙 우체국",
          content: "노트르담 대성당 바로 옆에 위치한 중앙 우체국은 19세기 후반 프랑스 건축가들이 설계했습니다. 웅장한 아치형 철골 천장과 고풍스러운 타일 바닥, 대형 홀 벽면의 수제 역사 지도로 유명합니다."
        },
        {
          language: Language.ja,
          title: "サイゴン中央郵便局",
          content: "ノートルダム大聖堂のすぐ隣に位置するこの郵便局は、19世紀末に建てられました。美しいアーチ型の鉄骨天井、クラシックなタイルの床、そして大ホールの壁に描かれた歴史的な手描きの地図が見どころです。"
        },
        {
          language: Language.zh,
          title: "西贡中央邮局",
          content: "紧邻圣母大教堂的中央邮局建于19世纪末，由法国著名建筑师设计。高大的弧形金属拱顶、古典花砖地面以及大堂两侧保存完好的巨幅手绘历史地图令人叹为观止。"
        }
      ]
    },
    {
      id: "bao-tang-chung-tich",
      name: "Bảo tàng Chứng tích Chiến tranh",
      category: "culture",
      address: "28 Võ Văn Tần, Phường Võ Thị Sáu, Quận 3",
      latitude: 10.7794,
      longitude: 106.6922,
      activationRadius: 45,
      priority: 8,
      description: "Nơi lưu giữ hơn 20.000 tài liệu, hiện vật và những hình ảnh chân thực về khát vọng hòa bình.",
      narrations: [
        {
          language: Language.vi,
          title: "Bảo tàng Chứng tích Chiến tranh",
          content: "Bảo tàng Chứng tích Chiến tranh là nơi lưu giữ những tư liệu, hiện vật và hình ảnh chân thực về cuộc kháng chiến bảo vệ Tổ quốc. Khuôn viên trưng bày nhiều loại máy bay, xe tăng quân sự và các phòng trưng bày ảnh báo chí quốc tế truyền tải thông điệp sâu sắc về hòa bình."
        },
        {
          language: Language.en,
          title: "War Remnants Museum",
          content: "The War Remnants Museum houses graphic exhibits and military artifacts documenting the realities of war and the quest for peace. The outdoor courtyard features armored vehicles and aircraft alongside powerful international photography exhibitions."
        },
        {
          language: Language.ko,
          title: "전쟁유적박물관",
          content: "전쟁의 참상과 평화의 소중함을 증언하는 귀중한 역사 유물과 기록 사진들이 보존된 곳입니다. 야외 전시장에는 군용기와 탱크가 전시되어 있으며 감동적인 보도사진들이 전시되어 있습니다."
        },
        {
          language: Language.ja,
          title: "戦争証跡博物館",
          content: "戦争の真実と平和への祈りを伝える貴重な資料や記録写真が展示されています。屋外には戦車や軍用機が並び、世界中の報道写真家による心を打つ作品が展示されています。"
        },
        {
          language: Language.zh,
          title: "战争遗迹博物馆",
          content: "馆内收藏了大量详实的图文资料与实物展品，真实记录了战争的苦难与对和平的渴望。户外展区陈列着重型装甲车与战机，馆内展出多位知名国际战地记者的纪实摄影原作。"
        }
      ]
    },
    {
      id: "nha-hat-thanh-pho",
      name: "Nhà hát Thành phố",
      category: "culture",
      address: "07 Công trường Lam Sơn, Phường Bến Nghé, Quận 1",
      latitude: 10.7767,
      longitude: 106.7032,
      activationRadius: 40,
      priority: 7,
      description: "Nhà hát phong cách Flamboyant tráng lệ với các bức phù điêu thiên thần và khán phòng xuất sắc.",
      narrations: [
        {
          language: Language.vi,
          title: "Nhà hát Thành phố",
          content: "Khánh thành vào năm 1900, Nhà hát Thành phố được xây dựng theo phong cách kiến trúc Flamboyant rực rỡ của thời kỳ Đệ tam Cộng hòa Pháp. Mặt tiền trang trí các bức phù điêu thiên thần, bên trong là khán phòng sang trọng với âm học xuất sắc."
        },
        {
          language: Language.en,
          title: "Saigon Opera House",
          content: "Inaugurated in 1900, the Opera House was built in the ornate Flamboyant style of the French Third Republic. Its facade is adorned with angelic reliefs, housing an acoustically refined auditorium for symphonies and theater."
        },
        {
          language: Language.ko,
          title: "호치민 시립극장",
          content: "1900년에 완공된 시립극장은 프랑스 제3공화국 시대의 화려한 플랑부아양 양식으로 지어졌습니다. 정면의 천사 부조 조각과 뛰어난 음향을 자랑하는 우아한 공연홀을 갖추고 있습니다."
        },
        {
          language: Language.ja,
          title: "市民劇場（サイゴン・オペラハウス）",
          content: "1900年に開館したこの劇場は、フランス第三共和政時代の華麗なフランボワイヤン様式で建てられました。ファサードの美しい彫刻と音響に優れた客席が特徴です。"
        },
        {
          language: Language.zh,
          title: "胡志明市大剧院",
          content: "竣工于1900年，采用法国第三共和国时期华丽的火焰哥特式风格建造。正面雕刻着精美的天使浮雕，剧院内部声学效果卓越，是艺术演出的神圣殿堂。"
        }
      ]
    },
    {
      id: "pho-di-bo-nguyen-hue",
      name: "Phố đi bộ Nguyễn Huệ",
      category: "view",
      address: "Đại lộ Nguyễn Huệ, Phường Bến Nghé, Quận 1",
      latitude: 10.7738,
      longitude: 106.7047,
      activationRadius: 55,
      priority: 8,
      description: "Quảng trường đi bộ hiện đại dài 670m nối liền trụ sở UBND Thành phố và bến Bạch Đằng.",
      narrations: [
        {
          language: Language.vi,
          title: "Phố đi bộ Nguyễn Huệ",
          content: "Đại lộ đi bộ hiện đại dài 670 mét nối từ Trụ sở UBND Thành phố đến Bến Bạch Đằng bên bờ sông Sài Gòn. Nơi đây từng là kênh đào Chợ Vải xưa, nay trở thành quảng trường văn hóa với hệ thống phun nước và ánh sáng lung linh."
        },
        {
          language: Language.en,
          title: "Nguyen Hue Walking Street",
          content: "A vibrant 670-meter pedestrian boulevard extending from City Hall down to the Bach Dang riverfront. Once the historic Grand Canal, it is now the premier public promenade featuring musical fountains and festive illuminations."
        },
        {
          language: Language.ko,
          title: "응우옌후에 보행자 거리",
          content: "호치민 인민위원회 청사부터 사이공강 바익당 선착장까지 670미터에 이르는 번화한 보행자 거리입니다. 과거 운하였던 곳이 분수대와 야경이 아름다운 시민 광장으로 변모했습니다."
        },
        {
          language: Language.ja,
          title: "グエンフエ歩行者天国",
          content: "人民委員会庁舎からサイゴン川のバクダン埠頭まで全長670メートルにわたる賑やかな遊歩道です。夜には噴水ショーと美しいイルミネーションで彩られる憩いの広場です。"
        },
        {
          language: Language.zh,
          title: "阮惠步行街",
          content: "长达670米的现代化步行大道，由胡志明市人民委员会大楼笔直延伸至西贡河畔的白藤码头。这里原为古老的运河，如今已是集音乐喷泉与夜景灯光于一身的城市客厅。"
        }
      ]
    },
    {
      id: "cho-ben-thanh",
      name: "Chợ Bến Thành",
      category: "food",
      address: "Đường Lê Lợi, Phường Bến Thành, Quận 1",
      latitude: 10.7725,
      longitude: 106.6980,
      activationRadius: 50,
      priority: 9,
      description: "Biểu tượng giao thương lâu đời với tháp đồng hồ bốn mặt tại cửa Nam nổi tiếng.",
      narrations: [
        {
          language: Language.vi,
          title: "Chợ Bến Thành",
          content: "Xây dựng từ năm 1912 đến 1914, Chợ Bến Thành với tháp đồng hồ bốn mặt tại cửa Nam là biểu tượng quen thuộc nhất của Sài Gòn. Ngôi chợ quy tụ hàng ngàn gian hàng phong phú từ thủ công mỹ nghệ cho đến khu ẩm thực nức tiếng."
        },
        {
          language: Language.en,
          title: "Ben Thanh Market",
          content: "Constructed between 1912 and 1914, Ben Thanh Market with its iconic four-sided clock tower is the ultimate symbol of Saigon. It features thousands of vibrant stalls offering souvenirs and famous street food delicacies."
        },
        {
          language: Language.ko,
          title: "벤탄 시장",
          content: "1912년에서 1914년 사이에 지어진 벤탄 시장은 남문의 4면 시계탑으로 유명한 호치민의 대표 랜드마크입니다. 전통 공예품과 각지의 대표 음식들을 만날 수 있습니다."
        },
        {
          language: Language.ja,
          title: "ベンタイン市場",
          content: "1912年から1914年にかけて建設されたベンタイン市場は、南門の4面時計台がホーチミンの象徴となっています。伝統工芸品から美味しい屋台グルメまで揃う活気ある市場です。"
        },
        {
          language: Language.zh,
          title: "滨城市场",
          content: "建于1912年至1914年间，南门醒目的四面钟楼是胡志明市家喻户晓的城市象征。市场内汇聚数千家商铺，传统手工艺品与越式特色美食应有尽有。"
        }
      ]
    },
    {
      id: "ben-nha-rong",
      name: "Bến Nhà Rồng — Bảo tàng Hồ Chí Minh",
      category: "culture",
      address: "01 Nguyễn Tất Thành, Phường 12, Quận 4",
      latitude: 10.7682,
      longitude: 106.7068,
      activationRadius: 50,
      priority: 8,
      description: "Di tích lịch sử nơi người thanh niên yêu nước Nguyễn Tất Thành ra đi tìm đường cứu nước năm 1911.",
      narrations: [
        {
          language: Language.vi,
          title: "Bến Nhà Rồng — Bảo tàng Hồ Chí Minh",
          content: "Tọa lạc bên ngã ba sông Sài Gòn, tòa nhà được xây dựng năm 1863 với hình tượng hai con rồng châu đầu vào mặt trăng trên nóc. Nơi đây gắn liền với sự kiện ngày 5 tháng 6 năm 1911, người thanh niên yêu nước Nguyễn Tất Thành ra đi tìm đường cứu nước."
        },
        {
          language: Language.en,
          title: "Dragon Wharf — Ho Chi Minh Museum",
          content: "Located by the Saigon River junction, this historic wharf was built in 1863 crowned with two dragons facing the moon. Here on June 5, 1911, young patriot Nguyen Tat Thanh set sail on his quest for national independence."
        },
        {
          language: Language.ko,
          title: "냐롱 부두 — 호치민 박물관",
          content: "사이공 강변에 위치한 냐롱 부두는 1863년에 지어진 서양식 건물로 지붕 위의 쌍용 조각이 특징입니다. 1911년 6월 5일 청년 호치민이 구국의 길을 찾아 출항한 역사적 장소입니다."
        },
        {
          language: Language.ja,
          title: "ニャロン埠頭 — ホーチミン博物館",
          content: "サイゴン川のほとりに位置し、1863年に建設されました。屋根にある二匹の龍の彫像が特徴的で、1911年6月5日にホー・チ・ミン主席が出航した歴史的な港です。"
        },
        {
          language: Language.zh,
          title: "龙屋港 — 胡志明博物馆",
          content: "坐落于西贡河畔，建于1863年，屋顶饰有双龙戏珠雕塑。1911年6月5日，年轻的胡志明主席正是在这个码头登上远洋轮船开启救国之路。"
        }
      ]
    }
  ];

  const allPois = [...saigonPois, ...saigonExtraPois];

  // Bộ khung thuyết minh bản địa hóa cho 15 ngôn ngữ mở rộng (đủ 20 ngôn ngữ x 13 POI = 260 Narrations)
  const extraLanguageTemplates: Array<{
    language: Language;
    intro: (title: string, address: string, enSummary: string) => { title: string; content: string };
  }> = [
    {
      language: Language.zh_TW,
      intro: (title, address, enSummary) => ({
        title: `${title}（繁體中文導覽）`,
        content: `歡迎蒞臨位於「${address}」的歷史文化地標「${title}」。這裡是不可錯過的經典景點，融合獨特建築藝術與深厚文化底蘊。${enSummary}`,
      }),
    },
    {
      language: Language.th,
      intro: (title, address, enSummary) => ({
        title: `${title} (คำบรรยายภาษาไทย)`,
        content: `ยินดีต้อนรับสู่ ${title} ตั้งอยู่ที่ ${address} สถานที่สำคัญทางประวัติศาสตร์และสถาปัตยกรรมอันทรงคุณค่า เชิญรับฟังเรื่องราวความเป็นมาและเอกลักษณ์ทางวัฒนธรรมของสถานที่แห่งนี้ ${enSummary}`,
      }),
    },
    {
      language: Language.lo,
      intro: (title, address, enSummary) => ({
        title: `${title} (ຄຳບັນຍາຍພາສາລາວ)`,
        content: `ຍິນດີຕ້ອນຮັບສູ່ ${title} ຕັ້ງຢູ່ທີ່ ${address}. ນີ້ແມ່ນສະຖານທີ່ທ່ອງທ່ຽວທາງປະຫວັດສາດ ແລະ ວັດທະນະທຳທີ່ສຳຄັນ. ${enSummary}`,
      }),
    },
    {
      language: Language.km,
      intro: (title, address, enSummary) => ({
        title: `${title} (ការណែនាំជាភាសាខ្មែរ)`,
        content: `សូមស្វាគមន៍មកកាន់ ${title} ដែលមានទីតាំងនៅ ${address}។ នេះជាទីតាំងប្រវត្តិសាស្ត្រ និងវប្បធម៌ដ៏ល្បីល្បាញ។ ${enSummary}`,
      }),
    },
    {
      language: Language.id,
      intro: (title, address, enSummary) => ({
        title: `${title} (Panduan Bahasa Indonesia)`,
        content: `Selamat datang di ${title}, yang terletak di ${address}. Destinasi bersejarah ini menawarkan arsitektur ikonik dan warisan budaya yang kaya. ${enSummary}`,
      }),
    },
    {
      language: Language.ms,
      intro: (title, address, enSummary) => ({
        title: `${title} (Panduan Bahasa Melayu)`,
        content: `Selamat datang ke ${title} di ${address}. Lokasi bersejarah ini terkenal dengan nilai seni bina dan warisan budaya yang unik. ${enSummary}`,
      }),
    },
    {
      language: Language.fil,
      intro: (title, address, enSummary) => ({
        title: `${title} (Gabay sa Filipino)`,
        content: `Maligayang pagdating sa ${title}, matatagpuan sa ${address}. Isa itong makasaysayang pook na may mayamang kultura at natatanging arkitektura. ${enSummary}`,
      }),
    },
    {
      language: Language.hi,
      intro: (title, address, enSummary) => ({
        title: `${title} (हिन्दी ऑडियो गाइड)`,
        content: `${address} में स्थित ऐतिहासिक स्थल ${title} में आपका स्वागत है। यह स्थान अपनी विशिष्ट वास्तुकला और समृद्ध सांस्कृतिक विरासत के लिए प्रसिद्ध है। ${enSummary}`,
      }),
    },
    {
      language: Language.ar,
      intro: (title, address, enSummary) => ({
        title: `${title} (الدليل الصوتي العربي)`,
        content: `مرحبًا بكم في ${title} الواقع في ${address}. يُعد هذا المعلم التاريخي والثقافي من أبرز الوجهات المعمارية والتراثية المميزة. ${enSummary}`,
      }),
    },
    {
      language: Language.ru,
      intro: (title, address, enSummary) => ({
        title: `${title} (Аудиогид на русском)`,
        content: `Добро пожаловать в ${title}, расположенный по адресу ${address}. Этот знаковый памятник истории и архитектуры хранит богатое культурное наследие. ${enSummary}`,
      }),
    },
    {
      language: Language.pt,
      intro: (title, address, enSummary) => ({
        title: `${title} (Guia em Português)`,
        content: `Bem-vindo a ${title}, localizado em ${address}. Este marco histórico destaca-se pela arquitetura singular e profundo valor cultural. ${enSummary}`,
      }),
    },
    {
      language: Language.it,
      intro: (title, address, enSummary) => ({
        title: `${title} (Guida in Italiano)`,
        content: `Benvenuti a ${title}, situato in ${address}. Questo celebre luogo storico unisce fascino architettonico e memoria culturale. ${enSummary}`,
      }),
    },
    {
      language: Language.fr,
      intro: (title, address, enSummary) => ({
        title: `${title} (Guide en Français)`,
        content: `Bienvenue à ${title}, situé au ${address}. Ce monument emblématique témoigne d'un patrimoine historique et architectural remarquable. ${enSummary}`,
      }),
    },
    {
      language: Language.de,
      intro: (title, address, enSummary) => ({
        title: `${title} (Deutscher Audioguide)`,
        content: `Willkommen bei ${title} in ${address}. Dieses historische Wahrzeichen begeistert durch seine Architektur und kulturelle Bedeutung. ${enSummary}`,
      }),
    },
    {
      language: Language.es,
      intro: (title, address, enSummary) => ({
        title: `${title} (Guía en Español)`,
        content: `Bienvenido a ${title}, ubicado en ${address}. Este emblemático sitio histórico destaca por su arquitectura y valor cultural. ${enSummary}`,
      }),
    },
  ];

  let totalNarrationsSeeded = 0;

  for (const p of allPois) {
    const poiRecord = await prisma.poi.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        category: p.category,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        activationRadius: p.activationRadius,
        priority: p.priority,
        description: p.description,
        status: PoiStatus.PUBLISHED,
      },
      create: {
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        activationRadius: p.activationRadius,
        priority: p.priority,
        description: p.description,
        status: PoiStatus.PUBLISHED,
      },
    });

    const enNar = p.narrations.find((n) => n.language === Language.en);
    const baseEnTitle = enNar?.title || p.name;
    const baseEnSummary = enNar?.content || p.description;

    const full20Narrations = [
      ...p.narrations,
      ...extraLanguageTemplates.map((tpl) => {
        const localized = tpl.intro(baseEnTitle, p.address, baseEnSummary);
        return {
          language: tpl.language,
          title: localized.title,
          content: localized.content,
        };
      }),
    ];

    for (const nar of full20Narrations) {
      const durationSeconds = Math.max(90, Math.min(240, Math.round(nar.content.length / 2.5)));
      await prisma.narration.upsert({
        where: {
          poiId_language: {
            poiId: poiRecord.id,
            language: nar.language,
          },
        },
        update: {
          title: nar.title,
          content: nar.content,
          durationSeconds,
        },
        create: {
          poiId: poiRecord.id,
          language: nar.language,
          title: nar.title,
          content: nar.content,
          durationSeconds,
        },
      });
      totalNarrationsSeeded++;
    }
  }
  console.log(`✅ Seeded ${allPois.length} POIs with ${totalNarrationsSeeded} Narrations across 20 languages (PUBLISHED status).`);

  // 4. Tour gợi ý 1: Tour Di Tích & Văn Hóa Trung Tâm Sài Gòn
  await prisma.tour.upsert({
    where: { id: "saigon-highlights" },
    update: {
      name: "Tour Di Tích & Văn Hóa Trung Tâm Sài Gòn",
      description: "Hành trình khám phá 8 di tích và danh thắng kiến trúc biểu tượng của TP.HCM.",
      isSuggested: true,
      estimatedMinutes: 45,
    },
    create: {
      id: "saigon-highlights",
      name: "Tour Di Tích & Văn Hóa Trung Tâm Sài Gòn",
      description: "Hành trình khám phá 8 di tích và danh thắng kiến trúc biểu tượng của TP.HCM.",
      isSuggested: true,
      estimatedMinutes: 45,
      stops: {
        create: [
          { poiId: "dinh-doc-lap", position: 1 },
          { poiId: "nha-tho-duc-ba", position: 2 },
          { poiId: "buu-dien-trung-tam", position: 3 },
          { poiId: "bao-tang-chung-tich", position: 4 },
          { poiId: "nha-hat-thanh-pho", position: 5 },
          { poiId: "pho-di-bo-nguyen-hue", position: 6 },
          { poiId: "cho-ben-thanh", position: 7 },
          { poiId: "ben-nha-rong", position: 8 },
        ],
      },
    },
  });

  // 5. Tour gợi ý 2: Tuyến Đi Bộ Di Sản & Ẩm Thực Sài Gòn
  await prisma.tour.upsert({
    where: { id: "saigon-heritage-walk" },
    update: {
      name: "Tuyến Đi Bộ Di Sản & Ẩm Thực Sài Gòn",
      description: "Tuyến đi bộ ngắm kiến trúc Pháp cổ kính, phố đi bộ sầm uất và trải nghiệm ẩm thực chợ Bến Thành.",
      isSuggested: true,
      estimatedMinutes: 30,
    },
    create: {
      id: "saigon-heritage-walk",
      name: "Tuyến Đi Bộ Di Sản & Ẩm Thực Sài Gòn",
      description: "Tuyến đi bộ ngắm kiến trúc Pháp cổ kính, phố đi bộ sầm uất và trải nghiệm ẩm thực chợ Bến Thành.",
      isSuggested: true,
      estimatedMinutes: 30,
      stops: {
        create: [
          { poiId: "nha-tho-duc-ba", position: 1 },
          { poiId: "buu-dien-trung-tam", position: 2 },
          { poiId: "nha-hat-thanh-pho", position: 3 },
          { poiId: "pho-di-bo-nguyen-hue", position: 4 },
          { poiId: "cho-ben-thanh", position: 5 },
        ],
      },
    },
  });

  // 6. Tour gợi ý 3: Tuyến Ký Ức Lịch Sử & Kiến Trúc Sài Gòn (Đồng bộ 100% TP.HCM)
  await prisma.tour.upsert({
    where: { id: "saigon-history-architecture" },
    update: {
      name: "Tuyến Ký Ức Lịch Sử & Kiến Trúc Sài Gòn",
      description: "Chiêm ngưỡng các kiệt tác nghệ thuật, bến cảng lịch sử và không gian văn hóa thanh bình giữa lòng phố thị.",
      isSuggested: true,
      estimatedMinutes: 45,
    },
    create: {
      id: "saigon-history-architecture",
      name: "Tuyến Ký Ức Lịch Sử & Kiến Trúc Sài Gòn",
      description: "Chiêm ngưỡng các kiệt tác nghệ thuật, bến cảng lịch sử và không gian văn hóa thanh bình giữa lòng phố thị.",
      isSuggested: true,
      estimatedMinutes: 45,
      stops: {
        create: [
          { poiId: "bao-tang-my-thuat", position: 1 },
          { poiId: "ben-bach-dang", position: 2 },
          { poiId: "ho-con-rua", position: 3 },
          { poiId: "thao-cam-vien", position: 4 },
          { poiId: "chua-ngoc-hoang", position: 5 },
        ],
      },
    },
  });

  console.log("✅ Seeded 3 suggested tours.");

  // 7. Seed Danh Mục 20 Ngôn Ngữ Chuẩn (LanguageCatalog - Toàn bộ 20 ngôn ngữ đều khả dụng)
  const languageList = [
    { code: 'vi', nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', nativeName: 'Tiếng Việt', flagEmoji: '🇻🇳', isAvailable: true, sortOrder: 1 },
    { code: 'en', nameVi: 'Tiếng Anh', nameEn: 'English', nativeName: 'English', flagEmoji: '🇬🇧', isAvailable: true, sortOrder: 2 },
    { code: 'zh', nameVi: 'Tiếng Trung (Giản thể)', nameEn: 'Chinese (Simplified)', nativeName: '中文（简体）', flagEmoji: '🇨🇳', isAvailable: true, sortOrder: 3 },
    { code: 'zh_TW', nameVi: 'Tiếng Trung (Phồn thể)', nameEn: 'Chinese (Traditional)', nativeName: '中文（繁體）', flagEmoji: '🇹🇼', isAvailable: true, sortOrder: 4 },
    { code: 'ja', nameVi: 'Tiếng Nhật', nameEn: 'Japanese', nativeName: '日本語', flagEmoji: '🇯🇵', isAvailable: true, sortOrder: 5 },
    { code: 'ko', nameVi: 'Tiếng Hàn', nameEn: 'Korean', nativeName: '한국어', flagEmoji: '🇰🇷', isAvailable: true, sortOrder: 6 },
    { code: 'th', nameVi: 'Tiếng Thái', nameEn: 'Thai', nativeName: 'ภาษาไทย', flagEmoji: '🇹🇭', isAvailable: true, sortOrder: 7 },
    { code: 'lo', nameVi: 'Tiếng Lào', nameEn: 'Lao', nativeName: 'ພາສາລາວ', flagEmoji: '🇱🇦', isAvailable: true, sortOrder: 8 },
    { code: 'km', nameVi: 'Tiếng Khmer', nameEn: 'Khmer', nativeName: 'ភាសាខ្មែរ', flagEmoji: '🇰🇭', isAvailable: true, sortOrder: 9 },
    { code: 'id', nameVi: 'Tiếng Indonesia', nameEn: 'Indonesian', nativeName: 'Bahasa Indonesia', flagEmoji: '🇮🇩', isAvailable: true, sortOrder: 10 },
    { code: 'ms', nameVi: 'Tiếng Malaysia', nameEn: 'Malay', nativeName: 'Bahasa Melayu', flagEmoji: '🇲🇾', isAvailable: true, sortOrder: 11 },
    { code: 'fil', nameVi: 'Tiếng Philippines', nameEn: 'Filipino', nativeName: 'Wikang Filipino', flagEmoji: '🇵🇭', isAvailable: true, sortOrder: 12 },
    { code: 'hi', nameVi: 'Tiếng Hindi', nameEn: 'Hindi', nativeName: 'हिन्दी', flagEmoji: '🇮🇳', isAvailable: true, sortOrder: 13 },
    { code: 'ar', nameVi: 'Tiếng Ả Rập', nameEn: 'Arabic', nativeName: 'العربية', flagEmoji: '🇸🇦', isAvailable: true, sortOrder: 14 },
    { code: 'ru', nameVi: 'Tiếng Nga', nameEn: 'Russian', nativeName: 'Русский', flagEmoji: '🇷🇺', isAvailable: true, sortOrder: 15 },
    { code: 'pt', nameVi: 'Tiếng Bồ Đào Nha', nameEn: 'Portuguese', nativeName: 'Português', flagEmoji: '🇵🇹', isAvailable: true, sortOrder: 16 },
    { code: 'it', nameVi: 'Tiếng Ý', nameEn: 'Italian', nativeName: 'Italiano', flagEmoji: '🇮🇹', isAvailable: true, sortOrder: 17 },
    { code: 'fr', nameVi: 'Tiếng Pháp', nameEn: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', isAvailable: true, sortOrder: 18 },
    { code: 'de', nameVi: 'Tiếng Đức', nameEn: 'German', nativeName: 'Deutsch', flagEmoji: '🇩🇪', isAvailable: true, sortOrder: 19 },
    { code: 'es', nameVi: 'Tiếng Tây Ban Nha', nameEn: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', isAvailable: true, sortOrder: 20 },
  ];

  for (const lang of languageList) {
    await prisma.languageCatalog.upsert({
      where: { code: lang.code },
      update: {
        nameVi: lang.nameVi,
        nameEn: lang.nameEn,
        nativeName: lang.nativeName,
        flagEmoji: lang.flagEmoji,
        isAvailable: lang.isAvailable,
        sortOrder: lang.sortOrder,
      },
      create: lang,
    });
  }
  console.log("✅ Seeded 20 languages in LanguageCatalog.");

  // 8. Seed Danh Mục Mã QR Di Tích (QrCode)
  const now = Date.now();
  const defaultQrCodes = [
    { code: 'QR-DINH-DOC-LAP', targetPoiId: 'dinh-doc-lap', label: 'Mã QR Dinh Độc Lập - Cổng Nam Kỳ Khởi Nghĩa', defaultLang: Language.vi, scanCount: 42, lastScannedAt: new Date(now - 2 * 3600 * 1000) },
    { code: 'QR-NHA-THO-DUC-BA', targetPoiId: 'nha-tho-duc-ba', label: 'Mã QR Nhà thờ Đức Bà - Quảng trường Công xã Paris', defaultLang: Language.vi, scanCount: 38, lastScannedAt: new Date(now - 3 * 3600 * 1000) },
    { code: 'QR-BUU-DIEN-TRUNG-TAM', targetPoiId: 'buu-dien-trung-tam', label: 'Mã QR Bưu điện Trung tâm TP.HCM', defaultLang: Language.en, scanCount: 29, lastScannedAt: new Date(now - 5 * 3600 * 1000) },
    { code: 'QR-BAO-TANG-CHUNG-TICH', targetPoiId: 'bao-tang-chung-tich', label: 'Mã QR Bảo tàng Chứng tích Chiến tranh', defaultLang: Language.en, scanCount: 31, lastScannedAt: new Date(now - 8 * 3600 * 1000) },
    { code: 'QR-NHA-HAT-THANH-PHO', targetPoiId: 'nha-hat-thanh-pho', label: 'Mã QR Nhà hát Thành phố - Công trường Lam Sơn', defaultLang: Language.vi, scanCount: 19, lastScannedAt: new Date(now - 12 * 3600 * 1000) },
    { code: 'QR-PHO-DI-BO-NGUYEN-HUE', targetPoiId: 'pho-di-bo-nguyen-hue', label: 'Mã QR Phố đi bộ Nguyễn Huệ', defaultLang: Language.ko, scanCount: 24, lastScannedAt: new Date(now - 18 * 3600 * 1000) },
    { code: 'QR-CHO-BEN-THANH', targetPoiId: 'cho-ben-thanh', label: 'Mã QR Chợ Bến Thành - Cửa Nam', defaultLang: Language.ja, scanCount: 35, lastScannedAt: new Date(now - 24 * 3600 * 1000) },
    { code: 'QR-BEN-NHA-RONG', targetPoiId: 'ben-nha-rong', label: 'Mã QR Bến Nhà Rồng - Bảo tàng Hồ Chí Minh', defaultLang: Language.vi, scanCount: 27, lastScannedAt: new Date(now - 36 * 3600 * 1000) },
  ];

  for (const qr of defaultQrCodes) {
    await prisma.qrCode.upsert({
      where: { code: qr.code },
      update: {
        targetPoiId: qr.targetPoiId,
        label: qr.label,
        defaultLang: qr.defaultLang,
        scanCount: qr.scanCount,
        lastScannedAt: qr.lastScannedAt,
      },
      create: qr,
    });
  }
  console.log("✅ Seeded 8 default QR Codes.");

  // 9. Seed Dữ liệu Thống kê Dashboard Admin (UC7 - Đảm bảo luôn có số liệu trong ngày hôm nay > 0)
  const dayMs = 24 * 3600 * 1000;
  const hourMs = 3600 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySafeTime = (offsetMinutes: number) =>
    new Date(Math.max(todayStart.getTime() + 60_000, now - offsetMinutes * 60_000));

  if ((await prisma.listeningEvent.count({ where: { createdAt: { gte: todayStart } } })) === 0) {
    await prisma.listeningEvent.createMany({
      data: [
        { visitorId: 'visitor-demo-01', poiId: 'dinh-doc-lap', language: Language.vi, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7769, longitude: 106.6953, durationSeconds: 185, startedAt: todaySafeTime(15), endedAt: new Date(todaySafeTime(15).getTime() + 185_000), createdAt: todaySafeTime(15) },
        { visitorId: 'visitor-demo-02', poiId: 'nha-tho-duc-ba', language: Language.en, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7798, longitude: 106.6990, durationSeconds: 160, startedAt: todaySafeTime(35), endedAt: new Date(todaySafeTime(35).getTime() + 160_000), createdAt: todaySafeTime(35) },
        { visitorId: 'visitor-demo-03', poiId: 'buu-dien-trung-tam', language: Language.ko, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, latitude: 10.7799, longitude: 106.6999, durationSeconds: 145, startedAt: todaySafeTime(55), endedAt: new Date(todaySafeTime(55).getTime() + 145_000), createdAt: todaySafeTime(55) },
        { visitorId: 'visitor-demo-12', poiId: 'dinh-doc-lap', language: Language.fr, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7770, longitude: 106.6953, durationSeconds: 170, startedAt: todaySafeTime(75), endedAt: new Date(todaySafeTime(75).getTime() + 170_000), createdAt: todaySafeTime(75) },
        { visitorId: 'visitor-demo-13', poiId: 'cho-ben-thanh', language: Language.de, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, latitude: 10.7725, longitude: 106.6980, durationSeconds: 155, startedAt: todaySafeTime(95), endedAt: new Date(todaySafeTime(95).getTime() + 155_000), createdAt: todaySafeTime(95) },
        { visitorId: 'visitor-demo-04', poiId: 'cho-ben-thanh', language: Language.ja, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7725, longitude: 106.6980, durationSeconds: 150, startedAt: new Date(now - 1 * dayMs), endedAt: new Date(now - 1 * dayMs + 150_000), createdAt: new Date(now - 1 * dayMs) },
        { visitorId: 'visitor-demo-01', poiId: 'ben-nha-rong', language: Language.vi, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, latitude: 10.7683, longitude: 106.7068, durationSeconds: 210, startedAt: new Date(now - 1 * dayMs - 3 * hourMs), endedAt: new Date(now - 1 * dayMs - 3 * hourMs + 210_000), createdAt: new Date(now - 1 * dayMs - 3 * hourMs) },
        { visitorId: 'visitor-demo-05', poiId: 'dinh-doc-lap', language: Language.es, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7769, longitude: 106.6953, durationSeconds: 190, startedAt: new Date(now - 2 * dayMs), endedAt: new Date(now - 2 * dayMs + 190_000), createdAt: new Date(now - 2 * dayMs) },
        { visitorId: 'visitor-demo-06', poiId: 'nha-tho-duc-ba', language: Language.vi, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7798, longitude: 106.6990, durationSeconds: 175, startedAt: new Date(now - 2 * dayMs - 5 * hourMs), endedAt: new Date(now - 2 * dayMs - 5 * hourMs + 175_000), createdAt: new Date(now - 2 * dayMs - 5 * hourMs) },
        { visitorId: 'visitor-demo-07', poiId: 'bao-tang-chung-tich', language: Language.th, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, latitude: 10.7795, longitude: 106.6921, durationSeconds: 240, startedAt: new Date(now - 3 * dayMs), endedAt: new Date(now - 3 * dayMs + 240_000), createdAt: new Date(now - 3 * dayMs) },
        { visitorId: 'visitor-demo-08', poiId: 'chua-ngoc-hoang', language: Language.zh, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7919, longitude: 106.6983, durationSeconds: 165, startedAt: new Date(now - 4 * dayMs), endedAt: new Date(now - 4 * dayMs + 165_000), createdAt: new Date(now - 4 * dayMs) },
        { visitorId: 'visitor-demo-09', poiId: 'dinh-doc-lap', language: Language.ru, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7769, longitude: 106.6953, durationSeconds: 180, startedAt: new Date(now - 5 * dayMs), endedAt: new Date(now - 5 * dayMs + 180_000), createdAt: new Date(now - 5 * dayMs) },
        { visitorId: 'visitor-demo-10', poiId: 'pho-di-bo-nguyen-hue', language: Language.vi, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, latitude: 10.7745, longitude: 106.7034, durationSeconds: 130, startedAt: new Date(now - 5 * dayMs - 2 * hourMs), endedAt: new Date(now - 5 * dayMs - 2 * hourMs + 130_000), createdAt: new Date(now - 5 * dayMs - 2 * hourMs) },
        { visitorId: 'visitor-demo-11', poiId: 'bao-tang-my-thuat', language: Language.ja, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, latitude: 10.7699, longitude: 106.6994, durationSeconds: 170, startedAt: new Date(now - 6 * dayMs), endedAt: new Date(now - 6 * dayMs + 170_000), createdAt: new Date(now - 6 * dayMs) },
      ],
    });
    console.log("✅ Seeded 14 ListeningEvents for Dashboard analytics.");
  }

  if ((await prisma.accessEvent.count({ where: { createdAt: { gte: todayStart } } })) === 0) {
    await prisma.accessEvent.createMany({
      data: [
        { visitorId: 'visitor-demo-01', ipAddress: '192.168.1.21', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.vi, poiId: 'dinh-doc-lap', source: AccessSource.QR, path: '/index.html?poi=dinh-doc-lap', createdAt: todaySafeTime(5) },
        { visitorId: 'visitor-demo-02', ipAddress: '192.168.1.22', userAgent: 'Mozilla/5.0 (Linux; Android 14)', deviceType: 'Mobile', language: Language.en, poiId: 'nha-tho-duc-ba', source: AccessSource.QR, path: '/index.html?poi=nha-tho-duc-ba', createdAt: todaySafeTime(18) },
        { visitorId: 'visitor-demo-12', ipAddress: '192.168.1.31', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.fr, poiId: 'dinh-doc-lap', source: AccessSource.TOUR, path: '/index.html?tour=saigon-highlights', createdAt: todaySafeTime(40) },
        { visitorId: 'visitor-demo-13', ipAddress: '192.168.1.32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)', deviceType: 'Desktop', language: Language.de, poiId: 'cho-ben-thanh', source: AccessSource.DIRECT, path: '/index.html', createdAt: todaySafeTime(65) },
        { visitorId: 'visitor-demo-03', ipAddress: '192.168.1.23', userAgent: 'Mozilla/5.0 (Windows NT 10.0)', deviceType: 'Desktop', language: Language.ko, poiId: 'buu-dien-trung-tam', source: AccessSource.DIRECT, path: '/index.html', createdAt: new Date(now - 1 * dayMs) },
        { visitorId: 'visitor-demo-04', ipAddress: '192.168.1.24', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.ja, poiId: 'cho-ben-thanh', source: AccessSource.TOUR, path: '/index.html?tour=saigon-highlights', createdAt: new Date(now - 1 * dayMs - 4 * hourMs) },
        { visitorId: 'visitor-demo-05', ipAddress: '192.168.1.25', userAgent: 'Mozilla/5.0 (Linux; Android 13)', deviceType: 'Mobile', language: Language.es, poiId: 'dinh-doc-lap', source: AccessSource.MAP, path: '/index.html', createdAt: new Date(now - 2 * dayMs) },
        { visitorId: 'visitor-demo-06', ipAddress: '192.168.1.26', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.vi, poiId: 'ben-nha-rong', source: AccessSource.QR, path: '/index.html?poi=ben-nha-rong', createdAt: new Date(now - 3 * dayMs) },
        { visitorId: 'visitor-demo-07', ipAddress: '192.168.1.27', userAgent: 'Mozilla/5.0 (Macintosh)', deviceType: 'Desktop', language: Language.zh, poiId: 'chua-ngoc-hoang', source: AccessSource.TOUR, path: '/index.html?tour=saigon-history-architecture', createdAt: new Date(now - 4 * dayMs) },
        { visitorId: 'visitor-demo-08', ipAddress: '192.168.1.28', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.vi, poiId: 'pho-di-bo-nguyen-hue', source: AccessSource.MAP, path: '/index.html', createdAt: new Date(now - 4 * dayMs - 5 * hourMs) },
        { visitorId: 'visitor-demo-09', ipAddress: '192.168.1.29', userAgent: 'Mozilla/5.0 (Linux; Android 14)', deviceType: 'Mobile', language: Language.ko, poiId: 'nha-hat-thanh-pho', source: AccessSource.QR, path: '/index.html?poi=nha-hat-thanh-pho', createdAt: new Date(now - 5 * dayMs) },
        { visitorId: 'visitor-demo-10', ipAddress: '192.168.1.30', userAgent: 'Mozilla/5.0 (iPhone)', deviceType: 'Mobile', language: Language.en, poiId: 'bao-tang-chung-tich', source: AccessSource.DIRECT, path: '/index.html', createdAt: new Date(now - 6 * dayMs) },
      ],
    });
    console.log("✅ Seeded 12 AccessEvents (including today visits) for Dashboard analytics.");
  }

  if ((await prisma.listeningSession.count()) === 0) {
    await prisma.listeningSession.createMany({
      data: [
        { visitorId: 'VIS-LIVE-01', poiId: 'dinh-doc-lap', language: Language.vi, mode: ListeningMode.AUTO, status: ListeningStatus.PLAYING, startedAt: todaySafeTime(3), lastHeartbeatAt: new Date(), durationSeconds: 95 },
        { visitorId: 'VIS-LIVE-02', poiId: 'nha-tho-duc-ba', language: Language.en, mode: ListeningMode.AUTO, status: ListeningStatus.PLAYING, startedAt: todaySafeTime(5), lastHeartbeatAt: new Date(), durationSeconds: 72 },
        { visitorId: 'VIS-LIVE-03', poiId: 'cho-ben-thanh', language: Language.fr, mode: ListeningMode.MANUAL, status: ListeningStatus.PREPARING, startedAt: todaySafeTime(1), lastHeartbeatAt: new Date(), durationSeconds: 12 },
        { visitorId: 'VIS-LIVE-04', poiId: 'buu-dien-trung-tam', language: Language.ko, mode: ListeningMode.AUTO, status: ListeningStatus.COMPLETED, startedAt: todaySafeTime(25), lastHeartbeatAt: todaySafeTime(22), endedAt: todaySafeTime(22), durationSeconds: 150 },
        { visitorId: 'VIS-LIVE-05', poiId: 'ben-nha-rong', language: Language.ja, mode: ListeningMode.MANUAL, status: ListeningStatus.COMPLETED, startedAt: todaySafeTime(45), lastHeartbeatAt: todaySafeTime(41), endedAt: todaySafeTime(41), durationSeconds: 185 },
      ],
    });
    console.log("✅ Seeded 5 ListeningSessions (PLAYING/PREPARING/COMPLETED) for Live Sessions table.");
  }

  const seedVisitors = [
    { visitorId: 'VIS-LIVE-01', passCode: 'DEMO-2026', language: Language.vi, deviceInfo: 'Mobile', lastActivePoiId: 'dinh-doc-lap', latitude: 10.7770, longitude: 106.6953, isSpeaking: true, lastSeenAt: new Date(), isActive: true },
    { visitorId: 'VIS-LIVE-02', passCode: 'TOUR-SAIGON-2026', language: Language.en, deviceInfo: 'Mobile', lastActivePoiId: 'nha-tho-duc-ba', latitude: 10.7798, longitude: 106.6990, isSpeaking: true, lastSeenAt: new Date(), isActive: true },
    { visitorId: 'VIS-LIVE-03', passCode: 'PASS-VIP-2026', language: Language.fr, deviceInfo: 'Desktop', lastActivePoiId: 'cho-ben-thanh', latitude: 10.7725, longitude: 106.6980, isSpeaking: false, lastSeenAt: new Date(), isActive: true },
  ];
  for (const vis of seedVisitors) {
    await prisma.visitorSession.upsert({
      where: { visitorId: vis.visitorId },
      update: {
        passCode: vis.passCode,
        language: vis.language,
        deviceInfo: vis.deviceInfo,
        lastActivePoiId: vis.lastActivePoiId,
        latitude: vis.latitude,
        longitude: vis.longitude,
        isSpeaking: vis.isSpeaking,
        lastSeenAt: vis.lastSeenAt,
        isActive: vis.isActive,
      },
      create: vis,
    });
  }
  console.log("✅ Seeded 3 active VisitorSessions for Live Radar.");

  if ((await prisma.auditEvent.count()) === 0) {
    await prisma.auditEvent.createMany({
      data: [
        { action: 'CREATE_POI', entityType: 'POI', entityId: 'dinh-doc-lap', actor: 'admin', metadata: JSON.stringify({ name: 'Dinh Độc Lập', status: PoiStatus.PUBLISHED }), createdAt: new Date(now - 6 * dayMs) },
        { action: 'PUBLISH_POI', entityType: 'POI', entityId: 'nha-tho-duc-ba', actor: 'admin', metadata: JSON.stringify({ status: PoiStatus.PUBLISHED }), createdAt: new Date(now - 5 * dayMs) },
        { action: 'UPSERT_NARRATION', entityType: 'NARRATION', entityId: 'dinh-doc-lap-vi', actor: 'admin', metadata: JSON.stringify({ poiId: 'dinh-doc-lap', language: Language.vi }), createdAt: new Date(now - 3 * dayMs) },
        { action: 'UPSERT_NARRATION', entityType: 'NARRATION', entityId: 'buu-dien-trung-tam-en', actor: 'admin', metadata: JSON.stringify({ poiId: 'buu-dien-trung-tam', language: Language.en }), createdAt: new Date(now - 2 * dayMs) },
        { action: 'UPLOAD_AUDIO', entityType: 'NARRATION', entityId: 'dinh-doc-lap-en', actor: 'admin', metadata: JSON.stringify({ poiId: 'dinh-doc-lap', language: Language.en, audioUrl: '/uploads/audio/sample-dinh-doc-lap-en.mp3' }), createdAt: todaySafeTime(10) },
      ],
    });
    console.log("✅ Seeded 5 AuditEvents.");
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
