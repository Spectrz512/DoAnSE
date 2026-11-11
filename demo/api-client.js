/**
 * Client Data Adapter cho Hệ thống Thuyết Minh Tự Động (TMTĐ) GeoAudio Guide
 * Nhiệm vụ:
 * 1. Tự động nhận diện API Base URL (Nginx reverse-proxy /api hoặc localhost:3000/api fallback).
 * 2. Hỗ trợ đầy đủ 5 ngôn ngữ: vi, en, ko, ja, zh.
 * 3. Cung cấp API cho UC1 (AccessPass), UC2 (Geofence nearby & anti-replay), UC5 (Listening events),
 *    UC6 (Tours & Custom Route), UC4 (AI Chatbot), UC3 & UC7 (Admin Stats, POI Status, Audit Logs).
 */

(function (global) {
  'use strict';

  /**
   * Tự động xác định Base URL máy chủ Backend linh hoạt:
   * 1. Ưu tiên window.API_BASE_URL (nếu được inject hoặc cấu hình trước).
   * 2. Nếu đang chạy qua trình duyệt trên cổng Nginx (8080, 80, 443 hoặc domain/IP LAN/ngrok): dùng relative path /api hoặc window.location.origin + '/api'.
   * 3. Chỉ fallback về http://localhost:3000/api nếu mở qua file:// hoặc các dev port độc lập (5500, 3001, 5173).
   */
  function resolveBaseUrl() {
    if (typeof window !== 'undefined') {
      if (window.API_BASE_URL && typeof window.API_BASE_URL === 'string') {
        return window.API_BASE_URL.trim().replace(/\/+$/, '');
      }
      const host = window.location.hostname || 'localhost';
      if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/api';
      }
      const port = window.location.port;
      // Khi mở trực tiếp qua cổng 3000
      if (port === '3000') {
        return '/api';
      }
      // Nếu mở qua VS Code Live Server hoặc dev standalone độc lập không có Nginx
      if (port === '5500' || port === '3001' || port === '5173') {
        return `http://${host}:3000/api`;
      }
      // Khi chạy qua Nginx (cổng 8080, 80, 443, IP LAN, ngrok):
      // Ưu tiên tuyệt đối đường dẫn tương đối /api để mọi request đi qua Nginx Reverse Proxy
      // Giúp thiết bị di động LAN chỉ cần kết nối duy nhất cổng 8080, tránh bị firewall chặn port 3000
      return '/api';
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
   * Chuẩn hóa mã ngôn ngữ theo 5 ngôn ngữ hỗ trợ: 'vi' | 'en' | 'ko' | 'ja' | 'zh'
   */
  function normalizeLanguage(lang) {
    const l = String(lang || '').toLowerCase().trim();
    if (DEFAULT_CONFIG.supportedLanguages.includes(l)) {
      return l;
    }
    return 'vi';
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
    if (Array.isArray(raw.narrations)) {
      raw.narrations.forEach(n => {
        if (n && n.language) {
          text[n.language] = [
            n.title || raw.name || '',
            n.content || raw.description || ''
          ];
        }
      });
    }

    if (!text.vi) text.vi = [raw.name || '', raw.description || ''];
    if (!text.en) text.en = text.vi;
    if (!text.ko) text.ko = text.vi;
    if (!text.ja) text.ja = text.vi;
    if (!text.zh) text.zh = text.vi;

    // Giữ tương thích nếu dữ liệu cũ có text sẵn
    if (raw.text && typeof raw.text === 'object') {
      ['vi', 'en', 'ko', 'ja', 'zh'].forEach(l => {
        if (raw.text[l] && !text[l]) text[l] = raw.text[l];
      });
    }

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
      narrations: Array.isArray(raw.narrations) ? raw.narrations : []
    };
  }

  /**
   * Chuẩn hóa 1 bản ghi Tour từ Backend
   */
  function normalizeTour(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const stops = Array.isArray(raw.stops)
      ? raw.stops.map(s => ({
          id: s.id,
          poiId: s.poiId,
          position: typeof s.position === 'number' ? s.position : 0,
          poi: s.poi ? normalizePoi(s.poi) : null
        })).sort((a, b) => a.position - b.position)
      : [];

    return {
      id: String(raw.id),
      name: raw.name || 'Tour chưa đặt tên',
      description: raw.description || '',
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
        { code: 'zh_TW', nameVi: 'Tiếng Trung (Phồn thể)', nameEn: 'Chinese (Traditional)', nativeName: '中文（繁體）', flagEmoji: '🇹🇼', isAvailable: false, sortOrder: 4 },
        { code: 'ja', nameVi: 'Tiếng Nhật', nameEn: 'Japanese', nativeName: '日本語', flagEmoji: '🇯🇵', isAvailable: true, sortOrder: 5 },
        { code: 'ko', nameVi: 'Tiếng Hàn', nameEn: 'Korean', nativeName: '한국어', flagEmoji: '🇰🇷', isAvailable: true, sortOrder: 6 },
        { code: 'th', nameVi: 'Tiếng Thái', nameEn: 'Thai', nativeName: 'ภาษาไทย', flagEmoji: '🇹🇭', isAvailable: false, sortOrder: 7 },
        { code: 'lo', nameVi: 'Tiếng Lào', nameEn: 'Lao', nativeName: 'ພາສາລາວ', flagEmoji: '🇱🇦', isAvailable: false, sortOrder: 8 },
        { code: 'km', nameVi: 'Tiếng Khmer', nameEn: 'Khmer', nativeName: 'ភាសាខ្មែរ', flagEmoji: '🇰🇭', isAvailable: false, sortOrder: 9 },
        { code: 'id', nameVi: 'Tiếng Indonesia', nameEn: 'Indonesian', nativeName: 'Bahasa Indonesia', flagEmoji: '🇮🇩', isAvailable: false, sortOrder: 10 },
        { code: 'ms', nameVi: 'Tiếng Malaysia', nameEn: 'Malay', nativeName: 'Bahasa Melayu', flagEmoji: '🇲🇾', isAvailable: false, sortOrder: 11 },
        { code: 'fil', nameVi: 'Tiếng Philippines', nameEn: 'Filipino', nativeName: 'Wikang Filipino', flagEmoji: '🇵🇭', isAvailable: false, sortOrder: 12 },
        { code: 'hi', nameVi: 'Tiếng Hindi', nameEn: 'Hindi', nativeName: 'हिन्दी', flagEmoji: '🇮🇳', isAvailable: false, sortOrder: 13 },
        { code: 'ar', nameVi: 'Tiếng Ả Rập', nameEn: 'Arabic', nativeName: 'العربية', flagEmoji: '🇸🇦', isAvailable: false, sortOrder: 14 },
        { code: 'ru', nameVi: 'Tiếng Nga', nameEn: 'Russian', nativeName: 'Русский', flagEmoji: '🇷🇺', isAvailable: false, sortOrder: 15 },
        { code: 'pt', nameVi: 'Tiếng Bồ Đào Nha', nameEn: 'Portuguese', nativeName: 'Português', flagEmoji: '🇵🇹', isAvailable: false, sortOrder: 16 },
        { code: 'it', nameVi: 'Tiếng Ý', nameEn: 'Italian', nativeName: 'Italiano', flagEmoji: '🇮🇹', isAvailable: false, sortOrder: 17 },
        { code: 'fr', nameVi: 'Tiếng Pháp', nameEn: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', isAvailable: false, sortOrder: 18 },
        { code: 'de', nameVi: 'Tiếng Đức', nameEn: 'German', nativeName: 'Deutsch', flagEmoji: '🇩🇪', isAvailable: false, sortOrder: 19 },
        { code: 'es', nameVi: 'Tiếng Tây Ban Nha', nameEn: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', isAvailable: false, sortOrder: 20 },
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
        tours: Array.isArray(data) ? data.map(normalizeTour).filter(Boolean) : []
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
  async function sendChatMessage(message) {
    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) return { ok: false, error: 'Tin nhắn không được để trống' };
    try {
      const data = await safeFetch('/chatbot/messages', {
        method: 'POST',
        body: JSON.stringify({ message: cleanMsg })
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
    upsertNarration
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
  }
  if (typeof global !== 'undefined') {
    global.ApiClient = ApiClient;
  }
})(typeof window !== 'undefined' ? window : globalThis);
