/**
 * ==============================================================================
 * THƯ VIỆN CLIENT DATA ADAPTER – HỆ THỐNG SÀI GÒN DI SẢN (GEOAUDIO GUIDE)
 * ==============================================================================
 * Vai trò & Nhiệm vụ cốt lõi:
 * 1. Cầu nối API duy nhất giữa 3 giao diện Frontend (index.html, admin.html, qr.html)
 *    với Backend máy chủ NestJS.
 * 2. Tự động nhận diện Base URL thông minh (resolveBaseUrl):
 *    - Hỗ trợ chạy qua Nginx Reverse Proxy (cổng 8080).
 *    - Hỗ trợ chạy qua Cloudflare Tunnel / Ngrok HTTPS.
 *    - Hỗ trợ điện thoại thật kết nối qua Wi-Fi LAN (192.168.x.x:8080 hoặc :3000).
 * 3. Hỗ trợ toàn diện 20 ngôn ngữ quốc tế (chuẩn hóa qua normalizeLanguage).
 * 4. Tích hợp từ điển đa ngôn ngữ cho Tour gợi ý (TOUR_I18N).
 * 5. Cung cấp các phương thức gọi API chính:
 *    - Du khách: fetchBootstrapData, fetchGeoCandidates, recordListeningEvent (chống lặp 5s),
 *      sendHeartbeat (mỗi 12s), sendLeave (rời trang), sendChatMessage (AI Chatbot Gemini).
 *    - Quản trị: fetchAdminStats, fetchAuditEvents, savePoi, deletePoi, uploadPoiAudio.
 *    - Kiosk QR: fetchNetworkInfo (lọc IP LAN).
 * ==============================================================================
 */

(function (global) {
  'use strict';

  /**
   * Tự động xác định Base URL máy chủ Backend linh hoạt:
   * 1. Ưu tiên window.API_BASE_URL (nếu được inject hoặc cấu hình trước).
   * 2. Nếu chạy qua HTTPS Tunnel (trycloudflare.com, ngrok), Nginx (8080) hoặc cổng 3000 (NestJS serveStatic):
   *    dùng window.location.origin + '/api' để điện thoại thật truy cập qua LAN hay Tunnel đều mượt mà 100%.
   * 3. Nếu mở từ cổng dev khác trên IP LAN (192.168.x.x, 10.x.x.x): tự động trỏ về http://${host}:3000/api.
   * 4. Chỉ fallback về http://localhost:3000/api nếu mở qua file:// hoặc localhost dev server khác cổng 3000.
   */
  function resolveBaseUrl() {
    if (typeof window !== 'undefined') {
      if (window.API_BASE_URL && typeof window.API_BASE_URL === 'string') {
        return window.API_BASE_URL.trim().replace(/\/+$/, '');
      }
      if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/api';
      }
      const host = window.location.hostname || 'localhost';
      const port = String(window.location.port || '');
      const proto = window.location.protocol;

      // 1. Khi chạy qua HTTPS Tunnel (trycloudflare.com, ngrok, loca.lt) hoặc cổng 80/443
      if (proto === 'https:' || host.includes('trycloudflare.com') || host.includes('ngrok') || host.includes('loca.lt') || port === '80' || port === '443') {
        return `${window.location.origin}/api`;
      }

      // 2. Khi chạy qua cổng 3000 (Backend NestJS phục vụ cả static demo & API) hoặc cổng 8080 (Nginx reverse-proxy)
      if (port === '3000' || port === '8080') {
        return `${window.location.origin}/api`;
      }

      // 3. Nếu đang mở từ cổng dev khác trên IP LAN (192.168.x.x, 10.x.x.x, 172.x.x.x) hoặc domain LAN
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3000/api`;
      }

      // 4. Mở trên localhost dev server khác cổng 3000 (VS Code Live Server 5500, Vite 5173, etc.)
      if (port && port !== '3000') {
        return `http://${host}:3000/api`;
      }

      return `${window.location.origin}/api`;
    }
    if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
      return String(process.env.API_BASE_URL).trim().replace(/\/+$/, '');
    }
    return 'http://localhost:3000/api';
  }

  // Cấu hình mặc định
  const DEFAULT_CONFIG = {
    baseUrl: resolveBaseUrl(),
    timeoutMs: 5000,
    supportedLanguages: [
      'vi', 'en', 'zh', 'zh_TW', 'ja', 'ko', 'th', 'lo', 'km', 'id',
      'ms', 'fil', 'hi', 'ar', 'ru', 'pt', 'it', 'fr', 'de', 'es'
    ],
    dedupWindowMs: 4000 // Chống gửi trùng sự kiện nghe trong 4 giây
  };

  // Trạng thái vận hành của Adapter
  const state = {
    baseUrl: DEFAULT_CONFIG.baseUrl,
    isLiveApi: false,
    source: 'uninitialized', // 'api' | 'fallback' | 'uninitialized'
    lastSyncAt: null,
    lastError: null
  };

  // Cache kiểm tra trùng lặp sự kiện nghe
  const recentEventsCache = new Map();

  function setBaseUrl(url) {
    if (typeof url === 'string' && url.trim()) {
      state.baseUrl = url.trim().replace(/\/+$/, '');
    }
  }

  function getState() {
    return { ...state };
  }

  /**
   * Chuẩn hóa mã ngôn ngữ theo đủ 20 ngôn ngữ hỗ trợ
   */
  function normalizeLanguage(lang) {
    const raw = String(lang || '').trim();
    if (!raw) return 'vi';
    const lower = raw.toLowerCase();
    const matched = DEFAULT_CONFIG.supportedLanguages.find(
      (code) => code.toLowerCase() === lower,
    );
    return matched || 'vi';
  }

  /**
   * Thực hiện HTTP Request an toàn với AbortController timeout & fallback thông minh
   */
  async function safeFetch(endpoint, options = {}, timeoutMs = DEFAULT_CONFIG.timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const cleanEndpoint = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${state.baseUrl}${cleanEndpoint}`;

    const headers = {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    try {
      let response;
      try {
        response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers
        });
      } catch (networkErr) {
        // Fallback thông minh 2 chiều giữa Nginx /api và http://${host}:3000/api
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          const host = window.location.hostname || 'localhost';
          const isDirect3000 = state.baseUrl.includes(':3000');
          const fallbackBase = isDirect3000 ? '/api' : `http://${host}:3000/api`;

          if (fallbackBase !== state.baseUrl) {
            try {
              const fallbackUrl = `${fallbackBase}${cleanEndpoint}`;
              response = await fetch(fallbackUrl, {
                ...options,
                signal: controller.signal,
                headers
              });
              state.baseUrl = fallbackBase;
              console.log(`[ApiClient] Fallback kết nối thành công: ${state.baseUrl}`);
            } catch (_) {
              throw networkErr;
            }
          } else {
            throw networkErr;
          }
        } else {
          throw networkErr;
        }
      }

      clearTimeout(timer);

      if (!response.ok) {
        let errBody;
        try {
          errBody = await response.json();
        } catch (_) {
          errBody = await response.text();
        }
        const error = new Error(
          (errBody && (errBody.message || errBody.error)) || `Máy chủ phản hồi lỗi HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.body = errBody;
        throw error;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutError = new Error(`Yêu cầu tới ${endpoint} quá thời gian chờ (${timeoutMs}ms)`);
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      throw err;
    }
  }

  /**
   * Chuẩn hóa 1 bản ghi POI từ Backend thành cấu trúc UI
   */
  function normalizePoi(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const text = {};
    const audioUrls = {};
    if (Array.isArray(raw.narrations)) {
      raw.narrations.forEach(n => {
        if (n && n.language) {
          text[n.language] = [
            n.title || raw.name || '',
            n.content || raw.description || ''
          ];
          if (n.audioUrl) {
            audioUrls[n.language] = n.audioUrl;
          }
        }
      });
    }

    if (!text.vi) text.vi = [raw.name || '', raw.description || ''];
    DEFAULT_CONFIG.supportedLanguages.forEach(l => {
      if (raw.text && typeof raw.text === 'object' && raw.text[l] && !text[l]) {
        text[l] = raw.text[l];
      }
      if (!text[l]) {
        text[l] = text.vi || text.en;
      }
    });

    const lat = typeof raw.lat === 'number' ? raw.lat : (typeof raw.latitude === 'number' ? raw.latitude : 0);
    const lng = typeof raw.lng === 'number' ? raw.lng : (typeof raw.longitude === 'number' ? raw.longitude : 0);
    const radius = typeof raw.radius === 'number' ? raw.radius : (typeof raw.activationRadius === 'number' ? raw.activationRadius : 50);

    let duration = typeof raw.duration === 'number' ? raw.duration : 5;
    if (typeof raw.duration !== 'number' && Array.isArray(raw.narrations)) {
      const nar = raw.narrations.find(n => typeof n.durationSeconds === 'number' && n.durationSeconds > 0);
      if (nar) {
        duration = Math.max(1, Math.round(nar.durationSeconds / 60));
      }
    }

    return {
      id: String(raw.id),
      name: raw.name || 'Địa điểm không tên',
      cat: raw.cat || raw.category || 'culture',
      category: raw.category || raw.cat || 'culture',
      address: raw.address || '',
      lat,
      latitude: lat,
      lng,
      longitude: lng,
      radius,
      activationRadius: radius,
      priority: typeof raw.priority === 'number' ? raw.priority : 0,
      duration,
      imageUrl: raw.imageUrl || null,
      status: raw.status || 'PUBLISHED',
      text,
      audioUrls,
      narrations: Array.isArray(raw.narrations) ? raw.narrations : []
    };
  }

  // ====================================================================
  // BỘ TỪ ĐIỂN ĐA NGÔN NGỮ CHO CÁC TOUR GỢI Ý (20 NGÔN NGỮ CHUẨN)
  // ====================================================================
  const TOUR_I18N = {
    'saigon-highlights': {
      vi: { name: 'Tour Di Tích & Văn Hóa Trung Tâm Sài Gòn', description: 'Hành trình khám phá 8 di tích và danh thắng kiến trúc biểu tượng của TP.HCM.' },
      en: { name: 'Saigon Iconic Heritage & Culture Tour', description: 'Explore the most iconic architectural landmarks and historical monuments in downtown Saigon.' },
      fr: { name: 'Circuit Patrimoine & Culture de Saïgon', description: 'Découvrez les monuments architecturaux et historiques les plus emblématiques du centre de Saïgon.' },
      ja: { name: 'サイゴン歴史・文化ハイライトツアー', description: 'ホーチミン市中心部の象徴的な歴史的建造物と文化遺産を巡るツアー。' },
      zh: { name: '西贡经典地标与文化之旅', description: '探访胡志明市中心最具代表性的历史古迹与法式建筑景观。' },
      zh_TW: { name: '西貢經典地標與文化之旅', description: '探訪胡志明市中心最具代表性的歷史古蹟與法式建築景觀。' },
      ko: { name: '사이공 핵심 문화유산 투어', description: '호치민 시내의 상징적인 역사 유적과 대표적인 건축 명소를 둘러보는 여정.' },
      de: { name: 'Saigon Highlights & Kulturerbe-Tour', description: 'Entdecken Sie die berühmtesten historischen und architektonischen Wahrzeichen im Herzen von Saigon.' },
      es: { name: 'Tour Patrimonial y Cultural de Saigón', description: 'Descubra los monumentos históricos y arquitectónicos más emblemáticos del centro de Saigón.' },
      ru: { name: 'Тур по наследию и культуре Сайгона', description: 'Главные исторические и архитектурные достопримечательности центра Сайгона.' },
      th: { name: 'ทัวร์มรดกวัฒนธรรมและแลนด์มาร์กไซง่อน', description: 'สำรวจสถานที่สำคัญทางประวัติศาสตร์และสถาปัตยกรรมอันเป็นเอกลักษณ์ใจกลางเมือง' },
      id: { name: 'Tur Warisan Sejarah & Budaya Saigon', description: 'Jelajahi landmark bersejarah dan keindahan arsitektur paling ikonik di pusat kota Saigon.' },
      ms: { name: 'Lawatan Warisan & Budaya Terkenal Saigon', description: 'Terokai mercu tanda sejarah dan seni bina paling ikonik di pusat bandaraya Saigon.' },
      fil: { name: 'Tour sa Pamana at Kultura ng Saigon', description: 'Tuklasin ang pinakasikat na makasaysayang pook at arkitektura sa gitna ng Saigon.' },
      hi: { name: 'साइगॉन विरासत और संस्कृति यात्रा', description: 'साइगॉन के केंद्र में सबसे प्रतिष्ठित ऐतिहासिक और वास्तुकला स्थलों का भ्रमण करें।' },
      ar: { name: 'جولة معالم التراث والثقافة في سايغون', description: 'استكشف أبرز المعالم التاريخية والمعمارية الشهيرة في وسط مدينة سايغون.' },
      it: { name: 'Tour del Patrimonio Storico di Saigon', description: 'Esplora i monumenti storici e architettonici più iconici del centro di Saigon.' },
      pt: { name: 'Tour do Patrimônio Histórico de Saigon', description: 'Explore os monumentos históricos e arquitetônicos mais emblemáticos do centro de Saigon.' },
      lo: { name: 'ທົວມໍລະດົກວັດທະນະທຳໄຊງ່ອນ', description: 'ສຳຫຼວດສະຖານທີ່ສຳຄັນທາງປະຫວັດສາດ ແລະ ສະຖາປັດຕະຍະກຳທີ່ໂດດເດັ່ນຂອງໄຊງ່ອນ.' },
      km: { name: 'ដំណើរកម្សាន្តបេតិកភណ្ឌនិងវប្បធម៌សៃហ្គន', description: 'ទស្សនាតំបន់ប្រវត្តិសាស្ត្រ និងស្ថាបត្យកម្មល្បីៗនៅកណ្តាលទីក្រុងសៃហ្គន។' }
    },
    'saigon-heritage-walk': {
      vi: { name: 'Tuyến Đi Bộ Di Sản & Ẩm Thực Sài Gòn', description: 'Tuyến đi bộ ngắm kiến trúc Pháp cổ kính, phố đi bộ sầm uất và trải nghiệm ẩm thực chợ Bến Thành.' },
      en: { name: 'Saigon Heritage & Culinary Walk', description: 'A pleasant walking route through French colonial architecture, vibrant pedestrian promenades, and Ben Thanh Market.' },
      fr: { name: 'Promenade Patrimoine & Gastronomie de Saïgon', description: 'Une promenade agréable mêlant architecture coloniale française, rue piétonne animée et saveurs du marché Ben Thanh.' },
      ja: { name: 'サイゴン歴史散策＆グルメウォーキング', description: 'フレンチコロニアル建築、賑やかなグエンフエ歩行者天国、ベンタイン市場の食文化を楽しむ散策ルート。' },
      zh: { name: '西贡历史漫步与美食路线', description: '漫步欣赏经典法式殖民建筑、阮惠步行街与滨城市场的道地西贡风味。' },
      zh_TW: { name: '西貢歷史漫步與美食路線', description: '漫步欣賞經典法式殖民建築、阮惠步行街與濱城市場的道地西貢風味。' },
      ko: { name: '사이공 역사 산책 & 미식 워킹 투어', description: '클래식한 프랑스 식민지 건축, 활기찬 보행자 거리와 벤탄 시장의 미식을 즐기는 도보 코스.' },
      de: { name: 'Saigon Kultur- und Kulinarik-Spaziergang', description: 'Ein stimmungsvoller Spaziergang vorbei an französischer Kolonialarchitektur, Fußgängerzone und Ben-Thanh-Markt.' },
      es: { name: 'Paseo Patrimonial y Culinario de Saigón', description: 'Un agradable recorrido a pie por la arquitectura colonial francesa, la calle peatonal y el mercado Ben Thanh.' },
      ru: { name: 'Пешеходный тур по наследию и гастрономии', description: 'Прогулка по колониальной архитектуре, оживленной пешеходной улице и знаменитому рынку Бен Тхань.' },
      th: { name: 'เส้นทางเดินชมมรดกและชิมอาหารไซง่อน', description: 'เดินชมสถาปัตยกรรมยุคอาณานิคม ถนนคนเดินเหงียนเหวะ และสัมผัสอาหารรสเลิศที่ตลาดเบ๊นถั่น' },
      id: { name: 'Jalan Santai Warisan & Kuliner Saigon', description: 'Rute jalan kaki menikmati arsitektur kolonial, jalan pedestrian ramai, dan kuliner khas Pasar Ben Thanh.' },
      ms: { name: 'Laluan Berjalan Kaki Warisan & Kulinari Saigon', description: 'Rute berjalan kaki santai menikmati seni bina kolonial Perancis, jalan pejalan kaki, dan Pasar Ben Thanh.' },
      fil: { name: 'Lakbay Pamana at Pagkaing Kalye ng Saigon', description: 'Maglakad sa mga makasaysayang gusaling Pranses, masiglang pedestrian street, at Ben Thanh Market.' },
      hi: { name: 'साइगॉन हेरिटेज और खानपान वॉक', description: 'फ्रांसीसी वास्तुकला, जीवंत पैदल मार्ग और बेन थान बाजार के व्यंजनों के माध्यम से सुखद पैदल यात्रा।' },
      ar: { name: 'جولة مشي للتراث والمأكولات في سايغون', description: 'مسار مشي ممتع بين العمارة الاستعمارية الفرنسية وشارع المشاة النابض وسوق بن ثانه الشهير.' },
      it: { name: 'Passeggiata Storica e Culinaria di Saigon', description: 'Una piacevole camminata tra architettura coloniale francese, isola pedonale e mercato di Ben Thanh.' },
      pt: { name: 'Caminhada Histórica e Culinária de Saigon', description: 'Um agradável passeio a pé pela arquitetura colonial francesa, rua de pedestres e mercado Ben Thanh.' },
      lo: { name: 'ເສັ້ນທາງຍ່າງຊົມມໍລະດົກ ແລະ ອາຫານໄຊງ່ອນ', description: 'ຍ່າງຊົມສະຖາປັດຕະຍະກຳຝຣັ່ງ, ຖະໜົນຄົນຍ່າງ ແລະ ຊິມອາຫານທີ່ຕະຫຼາດເບັນແທ່ງ.' },
      km: { name: 'ផ្លូវដើរកម្សាន្តបេតិកភណ្ឌនិងម្ហូបអាហារសៃហ្គន', description: 'ដើរទស្សនាស្ថាបត្យកម្មបែបបារាំង វិថីថ្មើរជើង និងរសជាតិម្ហូបនៅផ្សារបេនថាញ់។' }
    },
    'saigon-history-architecture': {
      vi: { name: 'Tuyến Ký Ức Lịch Sử & Kiến Trúc Sài Gòn', description: 'Chiêm ngưỡng các kiệt tác nghệ thuật, bến cảng lịch sử và không gian văn hóa thanh bình giữa lòng phố thị.' },
      en: { name: 'Saigon History & Architectural Icons Tour', description: 'Admire exquisite fine arts, historic river wharves, and peaceful sacred landmarks in the urban heart.' },
      fr: { name: 'Mémoires Historiques & Joyaux Architecturaux de Saïgon', description: 'Admirez les beaux-arts, les quais historiques et les sanctuaires paisibles au cœur de la ville.' },
      ja: { name: 'サイゴン歴史の記憶と名建築めぐり', description: '美術館の傑作、歴史的な波止場、都会の静寂な寺院など多彩な建築美を味わうルート。' },
      zh: { name: '西贡历史记忆与经典建筑之旅', description: '饱览美术馆艺术瑰宝、百年历史码头与都市中宁静祥和的古刹胜境。' },
      zh_TW: { name: '西貢歷史記憶與經典建築之旅', description: '飽覽美術館藝術瑰寶、百年歷史碼頭與都市中寧靜祥和的古剎勝境。' },
      ko: { name: '사이공 역사와 건축 명작 투어', description: '미술관의 예술적 걸작, 유서 깊은 부두와 도심 속 평화로운 사찰을 탐방하는 여정.' },
      de: { name: 'Saigon Geschichte & Architektur-Ikonen', description: 'Bewundern Sie bildende Kunst, historische Hafenanlagen und friedliche Heiligtümer im Herzen der Stadt.' },
      es: { name: 'Historia y Joyas Arquitectónicas de Saigón', description: 'Admire el arte refinado, los muelles históricos y los apacibles santuarios en el corazón urbano.' },
      ru: { name: 'История и архитектурные шедевры Сайгона', description: 'Шедевры искусства, исторические речные причалы и тихие святыни в самом центре Сайгона.' },
      th: { name: 'รอยอดีตประวัติศาสตร์และสถาปัตยกรรมไซง่อน', description: 'ชื่นชมงานศิลปะชั้นเลิศ ท่าเรือประวัติศาสตร์ และวัดวาอารามอันเงียบสงบใจกลางเมือง' },
      id: { name: 'Jejak Sejarah & Ikon Arsitektur Saigon', description: 'Nikmati mahakarya seni rupa, dermaga bersejarah, dan tempat ibadah damai di tengah kota.' },
      ms: { name: 'Memori Sejarah & Ikon Seni Bina Saigon', description: 'Kagumi karya seni halus, dermaga bersejarah, dan tempat ibadat yang mendamaikan di pusat bandar.' },
      fil: { name: 'Kasaysayan at Arkitektura ng Saigon', description: 'Hangaan ang magagandang sining, makasaysayang pantalan, at payapang dambana sa sentro ng lungsod.' },
      hi: { name: 'साइगॉन इतिहास और वास्तुकला के प्रतीक', description: 'शहर के केंद्र में ललित कला, ऐतिहासिक घाटों और शांत पवित्र स्थलों की प्रशंसा करें।' },
      ar: { name: 'تاريخ وأيقونات العمارة في سايغون', description: 'تأمل روائع الفنون الجميلة والأرصفة التاريخية والمزارات الهادئة في قلب المدينة.' },
      it: { name: 'Storia e Icone Architettoniche di Saigon', description: 'Ammira le belle arti, gli storici moli fluviali e i tranquilli santuari nel cuore urbano.' },
      pt: { name: 'História e Ícones Arquitetônicos de Saigon', description: 'Aprecie belas artes, cais históricos e santuários serenos no coração da metrópole.' },
      lo: { name: 'ຄວາມຊົງຈຳປະຫວັດສາດ ແລະ ສະຖາປັດໄຊງ່ອນ', description: 'ຊົມງານສິລະປະ, ທ່າເຮືອປະຫວັດສາດ ແລະ ວັດວາອາຮາມທີ່ສະຫງົບງຽບໃນກາງເມືອງ.' },
      km: { name: 'ការចងចាំប្រវត្តិសាស្ត្រនិងស្ថាបត្យកម្មសៃហ្គន', description: 'ទស្សនាសិល្បៈដ៏ប្រណិត កំពង់ផែប្រវត្តិសាស្ត្រ និងទីសក្ការបូជាដ៏ស្ងប់ស្ងាត់នៅកណ្តាលក្រុង។' }
    }
  };

  const TOUR_LABELS = {
    vi: { minutes: 'phút', minShort: 'p', stops: 'điểm dừng', apply: '➕ Áp dụng', applied: '✓ Đang áp dụng', suggestedTitle: '🌟 Tour Gợi Ý Từ Chuyên Gia', myTourTitle: '🧭 Lộ Trình Tour Của Tôi', walk: 'Đi bộ', listen: 'Thuyết minh', totalDist: 'Tổng khoảng cách:', estTime: 'Thời gian dự kiến:' },
    en: { minutes: 'min', minShort: 'm', stops: 'stops', apply: '➕ Apply', applied: '✓ Active', suggestedTitle: '🌟 Recommended Expert Tours', myTourTitle: '🧭 My Tour Itinerary', walk: 'Walking', listen: 'Audio guide', totalDist: 'Total distance:', estTime: 'Estimated time:' },
    fr: { minutes: 'min', minShort: 'min', stops: 'arrêts', apply: '➕ Appliquer', applied: '✓ Actif', suggestedTitle: '🌟 Circuits Recommandés', myTourTitle: '🧭 Mon Itinéraire', walk: 'Marche', listen: 'Audio guide', totalDist: 'Distance totale :', estTime: 'Durée estimée :' },
    ja: { minutes: '分', minShort: '分', stops: '箇所のスポット', apply: '➕ 適用する', applied: '✓ 適用中', suggestedTitle: '🌟 おすすめのエキスパートツアー', myTourTitle: '🧭 マイツアー行程', walk: '徒歩', listen: '音声ガイド', totalDist: '合計距離:', estTime: '所要時間目安:' },
    zh: { minutes: '分钟', minShort: '分', stops: '个停留点', apply: '➕ 应用路线', applied: '✓ 已应用', suggestedTitle: '🌟 专家精选推荐路线', myTourTitle: '🧭 我的行程路线', walk: '步行', listen: '语音讲解', totalDist: '总距离：', estTime: '预计总耗时：' },
    zh_TW: { minutes: '分鐘', minShort: '分', stops: '個站點', apply: '➕ 套用路線', applied: '✓ 已套用', suggestedTitle: '🌟 專家精選推薦路線', myTourTitle: '🧭 我的行程路線', walk: '步行', listen: '語音導覽', totalDist: '總距離：', estTime: '預計總時間：' },
    ko: { minutes: '분', minShort: '분', stops: '개 정류장', apply: '➕ 적용하기', applied: '✓ 적용됨', suggestedTitle: '🌟 추천 전문가 투어', myTourTitle: '🧭 나만의 투어 일정', walk: '도보', listen: '오디오 가이드', totalDist: '총 거리:', estTime: '예상 소요 시간:' },
    de: { minutes: 'Min.', minShort: 'm', stops: 'Stopps', apply: '➕ Anwenden', applied: '✓ Aktiv', suggestedTitle: '🌟 Empfohlene Touren', myTourTitle: '🧭 Meine Reiseroute', walk: 'Fußweg', listen: 'Audioguide', totalDist: 'Gesamtdistanz:', estTime: 'Geschätzte Dauer:' },
    es: { minutes: 'min', minShort: 'min', stops: 'paradas', apply: '➕ Aplicar', applied: '✓ Activo', suggestedTitle: '🌟 Tours Recomendados', myTourTitle: '🧭 Mi Itinerario de Tour', walk: 'A pie', listen: 'Audioguía', totalDist: 'Distancia total:', estTime: 'Tiempo estimado:' },
    ru: { minutes: 'мин', minShort: 'м', stops: 'остановок', apply: '➕ Применить', applied: '✓ Активен', suggestedTitle: '🌟 Рекомендуемые маршруты', myTourTitle: '🧭 Мой маршрут', walk: 'Пешком', listen: 'Аудиогид', totalDist: 'Общее расстояние:', estTime: 'Примерное время:' },
    th: { minutes: 'นาที', minShort: 'น.', stops: 'จุดแวะ', apply: '➕ นำไปใช้', applied: '✓ ใช้งานอยู่', suggestedTitle: '🌟 ทัวร์แนะนำโดยผู้เชี่ยวชาญ', myTourTitle: '🧭 แผนการเดินทางของฉัน', walk: 'เดิน', listen: 'บรรยายเสียง', totalDist: 'ระยะทางรวม:', estTime: 'เวลาโดยประมาณ:' },
    id: { minutes: 'menit', minShort: 'm', stops: 'pemberhentian', apply: '➕ Terapkan', applied: '✓ Aktif', suggestedTitle: '🌟 Tur Rekomendasi Ahli', myTourTitle: '🧭 Rencana Perjalanan Saya', walk: 'Jalan kaki', listen: 'Panduan audio', totalDist: 'Total jarak:', estTime: 'Perkiraan waktu:' },
    ms: { minutes: 'minit', minShort: 'm', stops: 'perhentian', apply: '➕ Guna Pakai', applied: '✓ Sedang Digunakan', suggestedTitle: '🌟 Lawatan Cadangan Pakar', myTourTitle: '🧭 Jadual Perjalanan Saya', walk: 'Berjalan', listen: 'Panduan audio', totalDist: 'Jumlah jarak:', estTime: 'Anggaran masa:' },
    fil: { minutes: 'minuto', minShort: 'min', stops: 'mga hintuan', apply: '➕ Ilapat', applied: '✓ Aktibo', suggestedTitle: '🌟 Inirekomendang Tour', myTourTitle: '🧭 Aking Itinerary sa Tour', walk: 'Lakad', listen: 'Audio gabay', totalDist: 'Kabuuang distansya:', estTime: 'Tinatayang oras:' },
    hi: { minutes: 'मिनट', minShort: 'मि', stops: 'स्टॉप', apply: '➕ लागू करें', applied: '✓ सक्रिय', suggestedTitle: '🌟 अनुशंसित टूर', myTourTitle: '🧭 मेरी यात्रा योजना', walk: 'पैदल', listen: 'ऑडियो गाइड', totalDist: 'कुल दूरी:', estTime: 'अनुमानित समय:' },
    ar: { minutes: 'دقيقة', minShort: 'د', stops: 'محطات', apply: '➕ تطبيق', applied: '✓ نشط', suggestedTitle: '🌟 جولات موصى بها من الخبراء', myTourTitle: '🧭 مسار رحلتي', walk: 'مشي', listen: 'دليل صوتي', totalDist: 'المسافة الإجمالية:', estTime: 'الوقت المقدر:' },
    it: { minutes: 'min', minShort: 'min', stops: 'fermate', apply: '➕ Applica', applied: '✓ Attivo', suggestedTitle: '🌟 Tour Consigliati dagli Esperti', myTourTitle: '🧭 Il Mio Itinerario', walk: 'Cammino', listen: 'Audioguida', totalDist: 'Distanza totale:', estTime: 'Tempo stimato:' },
    pt: { minutes: 'min', minShort: 'min', stops: 'paradas', apply: '➕ Aplicar', applied: '✓ Ativo', suggestedTitle: '🌟 Tours Recomendados por Especialistas', myTourTitle: '🧭 Meu Roteiro de Tour', walk: 'Caminhada', listen: 'Audioguia', totalDist: 'Distância total:', estTime: 'Tempo estimado:' },
    lo: { minutes: 'ນາທີ', minShort: 'ນ.', stops: 'ຈຸດແວ່', apply: '➕ ນຳໃຊ້', applied: '✓ ກຳລັງນຳໃຊ້', suggestedTitle: '🌟 ທົວແນະນຳຈາກຊ່ຽວຊານ', myTourTitle: '🧭 ເສັ້ນທາງທົວຂອງຂ້ອຍ', walk: 'ຍ່າງ', listen: 'ສຽງບັນຍາຍ', totalDist: 'ໄລຍະທາງທັງໝົດ:', estTime: 'ເວລາຄາດຄະເນ:' },
    km: { minutes: 'នាទី', minShort: 'ន', stops: 'កន្លែងឈប់', apply: '➕ អនុវត្ត', applied: '✓ កំពុងអនុវត្ត', suggestedTitle: '🌟 ដំណើរទេសចរណ៍ណែនាំ', myTourTitle: '🧭 ដំណើរកម្សាន្តរបស់ខ្ញុំ', walk: 'ដើរ', listen: 'សំឡេងណែនាំ', totalDist: 'ចម្ងាយសរុប៖', estTime: 'ពេលវេលាប្រមាណ៖' }
  };

  function getTourLabels(language = 'vi') {
    const lang = normalizeLanguage(language);
    return TOUR_LABELS[lang] || TOUR_LABELS.vi;
  }

  /**
   * Chuẩn hóa 1 bản ghi Tour từ Backend (Hỗ trợ 20 ngôn ngữ)
   */
  function normalizeTour(raw, language = 'vi') {
    if (!raw || typeof raw !== 'object') return null;

    const stops = Array.isArray(raw.stops)
      ? raw.stops.map(s => ({
          id: s.id,
          poiId: s.poiId,
          position: typeof s.position === 'number' ? s.position : 0,
          poi: s.poi ? normalizePoi(s.poi) : null
        })).sort((a, b) => a.position - b.position)
      : [];

    const lang = normalizeLanguage(language);
    const i18n = TOUR_I18N[raw.id] && (TOUR_I18N[raw.id][lang] || TOUR_I18N[raw.id].en);

    return {
      id: String(raw.id),
      name: (i18n && i18n.name) || raw.name || 'Tour chưa đặt tên',
      description: (i18n && i18n.description) || raw.description || '',
      isSuggested: Boolean(raw.isSuggested),
      estimatedMinutes: typeof raw.estimatedMinutes === 'number' ? raw.estimatedMinutes : stops.length * 8,
      stops,
      poiIds: stops.map(s => s.poiId).filter(Boolean)
    };
  }

  // ==========================================
  // UC1: ACCESS PASS (Kích hoạt vé tham quan)
  // ==========================================
  async function activateAccessPass(code, language = 'vi', deviceInfo = '') {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) {
      return { ok: false, error: 'Vui lòng nhập mã Access Pass' };
    }
    const lang = normalizeLanguage(language);
    try {
      const data = await safeFetch('/access-passes/activate', {
        method: 'POST',
        body: JSON.stringify({
          code: cleanCode,
          language: lang,
          deviceInfo: deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : 'web-browser')
        })
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function validateAccessPass(code) {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) return { ok: false, error: 'Mã không hợp lệ' };
    try {
      const data = await safeFetch(`/access-passes/validate/${encodeURIComponent(cleanCode)}`, { method: 'GET' });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function createAccessPass({ tourId, expiresInHours = 24, code } = {}) {
    try {
      const data = await safeFetch('/access-passes/create', {
        method: 'POST',
        body: JSON.stringify({
          ...(code ? { code: String(code).trim() } : {}),
          ...(tourId ? { tourId: String(tourId).trim() } : {}),
          expiresInHours: Number(expiresInHours) || 24
        })
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function sendHeartbeat(heartbeatData = {}) {
    if (!heartbeatData || !heartbeatData.visitorId) {
      return { ok: false, error: 'Thiếu visitorId' };
    }
    const payload = {
      visitorId: String(heartbeatData.visitorId),
      ...(heartbeatData.passCode ? { passCode: String(heartbeatData.passCode) } : {}),
      language: normalizeLanguage(heartbeatData.language || 'vi'),
      ...(heartbeatData.currentPoiId ? { currentPoiId: String(heartbeatData.currentPoiId) } : {}),
      deviceInfo: heartbeatData.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : 'browser'),
      ...(typeof heartbeatData.latitude === 'number' ? { latitude: heartbeatData.latitude } : {}),
      ...(typeof heartbeatData.longitude === 'number' ? { longitude: heartbeatData.longitude } : {}),
      isSpeaking: Boolean(heartbeatData.isSpeaking)
    };

    try {
      const data = await safeFetch('/listening-events/heartbeat', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function sendLeave(visitorId) {
    if (!visitorId) return;
    const cleanId = String(visitorId).trim();
    const url = `${state.baseUrl}/listening-events/leave`;
    const payload = JSON.stringify({ visitorId: cleanId });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  // ==========================================
  // POI & BOOTSTRAP
  // ==========================================
  async function fetchBootstrapData(fallbackPois = null) {
    try {
      const data = await safeFetch('/pois/bootstrap', { method: 'GET' });
      if (data && Array.isArray(data.pois)) {
        const normalizedPois = data.pois.map(normalizePoi).filter(Boolean);
        const normalizedTours = Array.isArray(data.tours) ? data.tours.map(normalizeTour).filter(Boolean) : [];

        state.isLiveApi = true;
        state.source = 'api';
        state.lastSyncAt = new Date();
        state.lastError = null;

        return {
          ok: true,
          source: 'api',
          isLiveApi: true,
          pois: normalizedPois,
          tours: normalizedTours,
          timestamp: state.lastSyncAt,
          raw: data
        };
      }
      throw new Error('Dữ liệu bootstrap thiếu mảng pois');
    } catch (err) {
      state.isLiveApi = false;
      state.source = 'fallback';
      state.lastError = err.message;
      const fallbackList = Array.isArray(fallbackPois) ? fallbackPois.map(normalizePoi).filter(Boolean) : [];
      return {
        ok: false,
        source: 'fallback',
        isLiveApi: false,
        error: err.message,
        pois: fallbackList,
        tours: [],
        timestamp: new Date()
      };
    }
  }

  // ==========================================
  // UC2: GEOFENCING & NEARBY POI
  // ==========================================
  async function fetchNearbyPois({ lat, lng, radiusM = 500, language = 'vi', playedPoiIds = [] }) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: 'Tọa độ GPS không hợp lệ', items: [], resetPoiIds: [] };
    }
    const lang = normalizeLanguage(language);
    const playedParam = Array.isArray(playedPoiIds) ? playedPoiIds.join(',') : String(playedPoiIds || '');
    try {
      const endpoint = `/pois/nearby?lat=${latitude}&lng=${longitude}&radiusM=${radiusM}&language=${lang}${playedParam ? `&playedPoiIds=${encodeURIComponent(playedParam)}` : ''}`;
      const data = await safeFetch(endpoint, { method: 'GET' });
      return {
        ok: true,
        source: 'api',
        userLocation: data.userLocation,
        radiusM: data.radiusM,
        resetPoiIds: Array.isArray(data.resetPoiIds) ? data.resetPoiIds : [],
        activePlayedPoiIds: Array.isArray(data.activePlayedPoiIds) ? data.activePlayedPoiIds : [],
        nextTriggerPoi: data.nextTriggerPoi || null,
        items: Array.isArray(data.items) ? data.items : []
      };
    } catch (err) {
      return {
        ok: false,
        source: 'offline',
        error: err.message,
        resetPoiIds: [],
        nextTriggerPoi: null,
        items: []
      };
    }
  }

  async function fetchGeoCandidates({ lat, lng, language = 'vi' }) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: 'Tọa độ GPS không hợp lệ', candidates: [] };
    }
    const lang = normalizeLanguage(language);
    try {
      const endpoint = `/geo/trigger-candidates?lat=${latitude}&lng=${longitude}&language=${encodeURIComponent(lang)}`;
      const data = await safeFetch(endpoint, { method: 'GET' });
      return { ok: true, source: 'api', candidates: Array.isArray(data) ? data : [] };
    } catch (err) {
      return { ok: false, source: 'offline', error: err.message, candidates: [] };
    }
  }

  // ==========================================
  // UC5: GHI NHẬN SỰ KIỆN NGHE THUYẾT MINH
  // ==========================================
  async function recordListeningEvent(event) {
    if (!event || !event.poiId) {
      return { ok: false, error: 'Thiếu thông tin poiId bắt buộc' };
    }

    const poiId = String(event.poiId);
    const mode = event.mode === 'AUTO' ? 'AUTO' : 'MANUAL';
    const language = normalizeLanguage(event.language);

    const dedupKey = `${poiId}:${mode}:${language}`;
    const now = Date.now();
    const lastSentAt = recentEventsCache.get(dedupKey) || 0;

    if (now - lastSentAt < DEFAULT_CONFIG.dedupWindowMs) {
      return {
        ok: true,
        duplicate: true,
        message: 'Bỏ qua ghi nhận trùng lặp trong khoảng thời gian ngắn',
        lastSentAt
      };
    }

    recentEventsCache.set(dedupKey, now);
    if (recentEventsCache.size > 100) {
      for (const [key, timestamp] of recentEventsCache.entries()) {
        if (now - timestamp > DEFAULT_CONFIG.dedupWindowMs * 2) {
          recentEventsCache.delete(key);
        }
      }
    }

    const payload = {
      poiId,
      mode,
      language,
      ...(typeof event.latitude === 'number' ? { latitude: event.latitude } : {}),
      ...(typeof event.longitude === 'number' ? { longitude: event.longitude } : {}),
      ...(event.visitorId ? { visitorId: String(event.visitorId) } : {})
    };

    try {
      const created = await safeFetch('/listening-events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { ok: true, source: 'api', event: created };
    } catch (err) {
      return { ok: false, source: 'offline', error: err.message, payload };
    }
  }

  // Quản lý phiên nghe trực tiếp (Listening Session Lifecycle)
  async function startListeningSession({ visitorId, poiId, language = 'vi', mode = 'AUTO', status = 'PLAYING' }) {
    if (!visitorId || !poiId) return { ok: false };
    try {
      const data = await safeFetch('/listening-events/session/start', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: String(visitorId),
          poiId: String(poiId),
          language: normalizeLanguage(language),
          mode: mode === 'MANUAL' ? 'MANUAL' : 'AUTO',
          status: status === 'PREPARING' ? 'PREPARING' : 'PLAYING'
        })
      });
      return { ok: true, session: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function updateListeningSession({ visitorId, poiId, durationSeconds = 0, status = 'PLAYING', errorMessage }) {
    if (!visitorId || !poiId) return { ok: false };
    try {
      const data = await safeFetch('/listening-events/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: String(visitorId),
          poiId: String(poiId),
          durationSeconds: Math.round(durationSeconds),
          status,
          ...(errorMessage ? { errorMessage } : {})
        })
      });
      return { ok: true, session: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function endListeningSession({ visitorId, poiId, durationSeconds = 0, status = 'COMPLETED', errorMessage }) {
    if (!visitorId || !poiId) return { ok: false };
    try {
      const data = await safeFetch('/listening-events/session/end', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: String(visitorId),
          poiId: String(poiId),
          durationSeconds: Math.round(durationSeconds),
          status: status === 'ERROR' ? 'ERROR' : 'COMPLETED',
          ...(errorMessage ? { errorMessage } : {})
        })
      });
      return { ok: true, event: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Ghi nhận lượt truy cập (Page Visit & QR Scan Access Event)
  async function recordAccessEvent({ visitorId, language = 'vi', poiId, source = 'DIRECT', deviceType, path }) {
    if (!visitorId) return { ok: false };
    try {
      const data = await safeFetch('/access-events', {
        method: 'POST',
        body: JSON.stringify({
          visitorId: String(visitorId),
          language: normalizeLanguage(language),
          ...(poiId ? { poiId: String(poiId) } : {}),
          source: source || 'DIRECT',
          deviceType: deviceType || (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'),
          path: path || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')
        })
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Danh mục 20 ngôn ngữ chuẩn
  async function fetchLanguages() {
    try {
      const data = await safeFetch('/languages');
      if (Array.isArray(data) && data.length > 0) {
        return { ok: true, languages: data };
      }
    } catch (e) {}
    // Fallback 20 ngôn ngữ
    return {
      ok: true,
      languages: [
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
      ]
    };
  }

  // Kiểm thử tải / Mô phỏng nhân đôi lượt nghe (Dev / Load Testing Simulation)
  async function simulateDoubleEvents(limit = 20) {
    try {
      const data = await safeFetch('/listening-events/simulate-double', {
        method: 'POST',
        body: JSON.stringify({ limit: Number(limit) || 20 })
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Thống kê truy cập
  async function fetchAccessStats(days = 7) {
    try {
      const data = await safeFetch(`/access-events/stats?days=${days}`);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ==========================================
  // UC6: TOURS & CUSTOM ROUTE
  // ==========================================
  async function fetchSuggestedTours(language = 'vi') {
    const lang = normalizeLanguage(language);
    try {
      const data = await safeFetch(`/tours/suggested?language=${lang}`, { method: 'GET' });
      return {
        ok: true,
        tours: Array.isArray(data) ? data.map(t => normalizeTour(t, lang)).filter(Boolean) : []
      };
    } catch (err) {
      return { ok: false, error: err.message, tours: [] };
    }
  }

  async function planCustomRoute({ poiIds, language = 'vi', walkingSpeedKmh = 4 }) {
    if (!Array.isArray(poiIds) || poiIds.length === 0) {
      return { ok: false, error: 'Vui lòng chọn ít nhất 1 điểm tham quan' };
    }
    const lang = normalizeLanguage(language);
    try {
      const data = await safeFetch('/tours/custom-route', {
        method: 'POST',
        body: JSON.stringify({
          poiIds,
          language: lang,
          walkingSpeedKmh: Number(walkingSpeedKmh) || 4
        })
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ==========================================
  // UC4: AI CHATBOT
  // ==========================================
  async function sendChatMessage(message, language = 'vi') {
    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) return { ok: false, error: 'Tin nhắn không được để trống' };
    try {
      const payload = { message: cleanMsg };
      if (language) payload.language = normalizeLanguage(language);
      const data = await safeFetch('/chatbot/messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { ok: true, reply: data.answer || data.reply || 'Đã nhận câu hỏi của bạn.' };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        reply: 'Hiện tại hướng dẫn viên AI đang bận. Bạn có thể chọn nghe thuyết minh trực tiếp trên bản đồ!'
      };
    }
  }

  // ==========================================
  // UC3 & UC7: ADMIN DASHBOARD & POI MANAGEMENT
  // ==========================================
  async function fetchAdminStats(adminKey = 'local-admin-key-change-me') {
    try {
      const data = await safeFetch('/admin/stats', {
        method: 'GET',
        headers: { 'x-admin-key': adminKey }
      });
      return { ok: true, stats: data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function fetchAuditEvents(adminKey = 'local-admin-key-change-me') {
    try {
      const data = await safeFetch('/admin/audit-events', {
        method: 'GET',
        headers: { 'x-admin-key': adminKey }
      });
      return { ok: true, audits: Array.isArray(data) ? data : [] };
    } catch (err) {
      return { ok: false, error: err.message, audits: [] };
    }
  }

  async function updatePoiStatus(poiId, status, adminKey = 'local-admin-key-change-me') {
    try {
      const data = await safeFetch(`/admin/pois/${encodeURIComponent(poiId)}/status`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey },
        body: JSON.stringify({ status })
      });
      return { ok: true, poi: data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function savePoi(poiData, adminKey = 'local-admin-key-change-me') {
    const isEdit = Boolean(poiData.id);
    const endpoint = isEdit ? `/admin/pois/${encodeURIComponent(poiData.id)}` : '/admin/pois';
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const saved = await safeFetch(endpoint, {
        method,
        headers: { 'x-admin-key': adminKey },
        body: JSON.stringify(poiData)
      });
      return { ok: true, poi: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function upsertNarration(poiId, narrationData, adminKey = 'local-admin-key-change-me') {
    try {
      const saved = await safeFetch(`/admin/pois/${encodeURIComponent(poiId)}/narrations`, {
        method: 'PUT',
        headers: { 'x-admin-key': adminKey },
        body: JSON.stringify(narrationData)
      });
      return { ok: true, narration: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function deletePoi(poiId, adminKey = 'local-admin-key-change-me') {
    try {
      const data = await safeFetch(`/admin/pois/${encodeURIComponent(poiId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey }
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function uploadPoiAudio(poiId, formData, adminKey = 'local-admin-key-change-me') {
    const endpoint = poiId
      ? `/admin/pois/${encodeURIComponent(poiId)}/audio`
      : '/admin/upload-audio';
    try {
      const response = await fetch(`${state.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data?.message || `HTTP ${response.status}` };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Lấy danh sách địa chỉ IPv4 LAN thực tế của máy chủ Backend
   */
  async function fetchNetworkInfo() {
    try {
      const data = await safeFetch('/system/network-info');
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  const ApiClient = {
    setBaseUrl,
    resolveBaseUrl,
    getState,
    normalizePoi,
    normalizeTour,
    normalizeLanguage,
    TOUR_I18N,
    TOUR_LABELS,
    getTourLabels,
    DEFAULT_CONFIG,
    // Client Methods
    fetchBootstrapData,
    activateAccessPass,
    validateAccessPass,
    createAccessPass,
    sendHeartbeat,
    sendLeave,
    fetchNearbyPois,
    fetchGeoCandidates,
    recordListeningEvent,
    startListeningSession,
    updateListeningSession,
    endListeningSession,
    recordAccessEvent,
    fetchLanguages,
    fetchSuggestedTours,
    planCustomRoute,
    sendChatMessage,
    // Network & System Info
    fetchNetworkInfo,
    // Admin & Simulation Methods
    fetchAdminStats,
    fetchAccessStats,
    simulateDoubleEvents,
    fetchAuditEvents,
    updatePoiStatus,
    savePoi,
    deletePoi,
    upsertNarration,
    uploadPoiAudio
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
  }
  if (typeof global !== 'undefined') {
    global.ApiClient = ApiClient;
  }
})(typeof window !== 'undefined' ? window : globalThis);
