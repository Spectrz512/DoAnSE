import { Language, PassStatus, PoiStatus, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/linh_ung?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Tạo sẵn mã AccessPass mặc định DEMO-2026 (ACTIVE, hạn dùng 30 ngày)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.accessPass.upsert({
    where: { code: "DEMO-2026" },
    update: {
      status: PassStatus.ACTIVE,
      expiresAt,
    },
    create: {
      code: "DEMO-2026",
      status: PassStatus.ACTIVE,
      expiresAt,
    },
  });
  console.log("✅ Seeded AccessPass: DEMO-2026");

  // 2. Danh sách POI Chùa Linh Ứng (Đà Nẵng) với 5 ngôn ngữ
  const linhUngPois = [
    {
      id: "chua-linh-ung-cong-tam-quan",
      name: "Cổng Tam Quan Chùa Linh Ứng",
      category: "temple",
      address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
      latitude: 16.1068,
      longitude: 108.2730,
      activationRadius: 45,
      priority: 8,
      description: "Cửa ngõ chính dẫn vào chốn bồng lai thanh tịnh của Chùa Linh Ứng Bãi Bụt.",
      narrations: [
        {
          language: Language.vi,
          title: "Cổng Tam Quan Chùa Linh Ứng",
          content: "Chào mừng quý khách đến với Chùa Linh Ứng Bãi Bụt trên bán đảo Sơn Trà. Cổng Tam Quan sừng sững uy nghiêm với mái ngói lưu ly xanh biếc, biểu trưng cho ba cách nhìn của Phật giáo: Không quan, Giả quan và Trung quan."
        },
        {
          language: Language.en,
          title: "Linh Ung Temple Triple Gate",
          content: "Welcome to Linh Ung Pagoda at Bai But, Son Tra Peninsula. The majestic Triple Gate features vibrant blue-glazed tiles symbolizing Buddhist contemplation and marks your entry into this serene sanctuary."
        },
        {
          language: Language.ko,
          title: "린응사 삼문 (일주문)",
          content: "손짜 반도 바이붓에 위치한 린응사에 오신 것을 환영합니다. 푸른 기와지붕이 돋보이는 웅장한 삼문은 불교의 지혜를 상징하며 평화로운 사찰 경내로 안내합니다."
        },
        {
          language: Language.ja,
          title: "リンウン寺 三門",
          content: "ソンチャ半島のリンウン寺へようこそ。青い瓦屋根が美しくそびえる三門は、仏教の深い智慧を象徴し、訪れる人々を静寂な祈りの空間へと導きます。"
        },
        {
          language: Language.zh,
          title: "灵应寺 三门",
          content: "欢迎来到山茶半岛的灵应寺。雄伟的三门顶覆青翠琉璃瓦，象征着佛家空、假、中三观智慧，引领香客踏入清幽祥和的佛门圣地。"
        }
      ]
    },
    {
      id: "chua-linh-ung-tuong-quan-am",
      name: "Tượng Phật Bà Quan Âm 67m",
      category: "statue",
      address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
      latitude: 16.10699,
      longitude: 108.27354,
      activationRadius: 50,
      priority: 10,
      description: "Tượng Phật Quan Thế Âm cao 67 mét ngự trên đài hoa sen, tựa lưng vào núi hướng nhìn ra biển Đông.",
      narrations: [
        {
          language: Language.vi,
          title: "Tượng Phật Bà Quan Thế Âm 67m",
          content: "Trước mắt quý khách là đại tượng Bồ Tát Quán Thế Âm cao 67 mét, tương đương tòa nhà 30 tầng. Một tay Người bắt ấn tam muội, tay kia cầm bình nước cam lồ như đang tưới an lành xuống biển khơi và che chở cho ngư dân."
        },
        {
          language: Language.en,
          title: "Lady Buddha Statue 67m",
          content: "Standing 67 meters tall atop a lotus petal pedestal, this iconic Lady Buddha is the tallest Avalokiteshvara statue in Vietnam, looking serenely toward the East Sea to protect seafarers."
        },
        {
          language: Language.ko,
          title: "67미터 해수관음상",
          content: "연꽃 대좌 위에 세워진 높이 67미터의 장엄한 해수관음보살상입니다. 베트남에서 가장 높은 관음상으로 한 손에는 감로수병을 들고 바다를 굽어보며 평온을 기원합니다."
        },
        {
          language: Language.ja,
          title: "高さ67m 観音菩薩像",
          content: "蓮華座の上に立つ高さ67メートルの観音菩薩像はベトナム最大級です。東シナ海を優しく見守り、航海の安全と平和を祈り続けています。"
        },
        {
          language: Language.zh,
          title: "67米 观音圣像",
          content: "高达67米的白玉观世音菩萨像屹立于莲花座上，相当于30层楼高。菩萨手持甘露水净瓶，慈目俯瞰浩瀚东海，普度众生、庇佑风调雨顺。"
        }
      ]
    },
    {
      id: "chua-linh-ung-chanh-dien",
      name: "Chánh Điện Chùa Linh Ứng",
      category: "temple",
      address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
      latitude: 16.1075,
      longitude: 108.2742,
      activationRadius: 45,
      priority: 9,
      description: "Chánh điện uy nghi với các cột rồng uốn lượn và tượng Phật Thích Ca Mâu Ni tôn nghiêm.",
      narrations: [
        {
          language: Language.vi,
          title: "Chánh Điện Chùa Linh Ứng",
          content: "Chánh điện mang kiến trúc truyền thống kết hợp hiện đại với mái ngói cong vững chãi. Chính giữa thờ Đức Bổn Sư Thích Ca Mâu Ni, bên phải thờ Quan Thế Âm Bồ Tát, bên trái thờ Địa Tạng Vương Bồ Tát."
        },
        {
          language: Language.en,
          title: "Linh Ung Pagoda Main Sanctuary",
          content: "The Main Sanctuary combines traditional and contemporary Vietnamese Buddhist architecture. Inside, Shakyamuni Buddha sits flanked by Avalokiteshvara and Ksitigarbha Bodhisattvas."
        },
        {
          language: Language.ko,
          title: "린응사 대웅보전",
          content: "대웅전은 전통적인 베트남 불교 건축 양식으로 지어졌습니다. 중앙에는 석가모니불이 모셔져 있고 좌우로 관세음보살과 지장보살이 협시하고 있습니다."
        },
        {
          language: Language.ja,
          title: "リンウン寺 本堂（大雄宝殿）",
          content: "伝統的な屋根の反りが美しい本堂です。中央には釈迦牟尼仏が鎮座し、脇侍として観世音菩薩と地蔵菩薩が厳かに安置されています。"
        },
        {
          language: Language.zh,
          title: "灵应寺 大雄宝殿",
          content: "大殿气势恢宏，雕梁画栋。正中供奉释迦牟尼佛，右侧供奉观世音菩萨，左侧供奉地藏王菩萨，佛光普照，香火鼎盛。"
        }
      ]
    },
    {
      id: "chua-linh-ung-vuon-la-han",
      name: "Vườn 18 Tượng Vị La Hán",
      category: "garden",
      address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
      latitude: 16.1063,
      longitude: 108.2738,
      activationRadius: 40,
      priority: 7,
      description: "18 pho tượng Thập Bát La Hán tạc bằng đá trắng nguyên khối với các biểu cảm sinh động.",
      narrations: [
        {
          language: Language.vi,
          title: "Vườn 18 Vị La Hán",
          content: "Dọc hai bên lối vào Chánh điện là 18 vị La Hán được điêu khắc tinh xảo từ đá trắng nguyên khối bởi các nghệ nhân làng đá Non Nước. Mỗi pho tượng thể hiện hỷ nộ ái ố vô cùng sống động."
        },
        {
          language: Language.en,
          title: "18 Arhats Garden",
          content: "Flanking the courtyard are 18 meticulously carved white marble Arhat statues crafted by Non Nuoc artisans, each capturing distinct human expressions of enlightenment and emotion."
        },
        {
          language: Language.ko,
          title: "십팔나한상 정원",
          content: "대웅전 앞마당 양옆에는 18분의 나한상이 흰 대리석으로 정교하게 조각되어 있습니다. 각 나한마다 희로애락의 생동감 넘치는 표정을 감상할 수 있습니다."
        },
        {
          language: Language.ja,
          title: "十八羅漢の庭",
          content: "本堂へ続く庭園の両脇には、ノンヌオック村の職人が彫り上げた18体の白大理石の羅漢像が並び、喜怒哀楽の豊かな表情を伝えています。"
        },
        {
          language: Language.zh,
          title: "十八罗汉石雕园",
          content: "大殿庭院两侧陈列着由五行山石雕艺人精心雕琢的十八罗汉白大理石圣像，尊尊神态逼真，生动刻画了佛家修行的精神境界。"
        }
      ]
    },
    {
      id: "chua-linh-ung-thap-xa-loi",
      name: "Tháp Xá Lợi Chùa Linh Ứng",
      category: "tower",
      address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
      latitude: 16.1082,
      longitude: 108.2750,
      activationRadius: 40,
      priority: 8,
      description: "Tháp cao 9 tầng thờ xá lợi Phật và hàng trăm tượng Phật tôn nghiêm.",
      narrations: [
        {
          language: Language.vi,
          title: "Tháp Xá Lợi",
          content: "Tháp Xá Lợi 9 tầng vươn cao bên sườn núi Sơn Trà. Đây là nơi tôn kính lưu giữ xá lợi Phật linh thiêng, đồng thời mở ra tầm nhìn bao quát toàn cảnh vịnh Đà Nẵng xanh thẳm."
        },
        {
          language: Language.en,
          title: "Linh Ung Relic Stupa",
          content: "The 9-story Relic Stupa rises gracefully on the Son Tra hillside, enshrining sacred Buddhist relics and offering panoramic vistas of the Danang coastline."
        },
        {
          language: Language.ko,
          title: "사리탑",
          content: "손짜 산비탈에 우뚝 솟은 9층 사리탑은 신성한 불사리를 모시고 있으며, 다낭 해안선의 탁 트인 절경을 감상할 수 있는 명소입니다."
        },
        {
          language: Language.ja,
          title: "舎利塔",
          content: "ソンチャの山肌に優美にそびえる9重の舎利塔です。仏舎利が安置されており、ダナン湾の素晴らしいパノラマを一望できます。"
        },
        {
          language: Language.zh,
          title: "舍利宝塔",
          content: "九层舍利塔高耸入云，塔内安奉着神圣的佛陀舍利。登临塔前，岘港碧蓝的海湾美景与无垠天际尽收眼底。"
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

  const allPois = [...linhUngPois, ...saigonPois];

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

    for (const nar of p.narrations) {
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
        },
        create: {
          poiId: poiRecord.id,
          language: nar.language,
          title: nar.title,
          content: nar.content,
        },
      });
    }
  }
  console.log(`✅ Seeded ${allPois.length} POIs with 5 languages (PUBLISHED status).`);

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

  // 6. Tour gợi ý 3: Hành Trình Tâm Linh Bán Đảo Sơn Trà (Chùa Linh Ứng)
  await prisma.tour.upsert({
    where: { id: "linh-ung-panoramic" },
    update: {
      name: "Hành Trình Tâm Linh Chùa Linh Ứng Bãi Bụt",
      description: "Chiêm bái Tượng Phật Bà 67m, Cổng Tam Quan, Vườn La Hán và ngắm trọn biển Đông từ bán đảo Sơn Trà.",
      isSuggested: true,
      estimatedMinutes: 40,
    },
    create: {
      id: "linh-ung-panoramic",
      name: "Hành Trình Tâm Linh Chùa Linh Ứng Bãi Bụt",
      description: "Chiêm bái Tượng Phật Bà 67m, Cổng Tam Quan, Vườn La Hán và ngắm trọn biển Đông từ bán đảo Sơn Trà.",
      isSuggested: true,
      estimatedMinutes: 40,
      stops: {
        create: [
          { poiId: "chua-linh-ung-cong-tam-quan", position: 1 },
          { poiId: "chua-linh-ung-tuong-quan-am", position: 2 },
          { poiId: "chua-linh-ung-chanh-dien", position: 3 },
          { poiId: "chua-linh-ung-vuon-la-han", position: 4 },
          { poiId: "chua-linh-ung-thap-xa-loi", position: 5 },
        ],
      },
    },
  });

  console.log("✅ Seeded 3 suggested tours.");
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
