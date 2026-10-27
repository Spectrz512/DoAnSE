/**
 * Test Suite cho Client Data Adapter (demo/api-client.js)
 * Chạy bằng: node demo/test-api-client.js
 */

const assert = require('assert');
const ApiClient = require('./api-client.js');

let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n=== KIỂM THỬ 1: CHUẨN HÓA MÃ NGÔN NGỮ ===');
  it('Chấp nhận cả 5 ngôn ngữ backend hỗ trợ: vi, en, ko, ja, zh', () => {
    assert.strictEqual(ApiClient.normalizeLanguage('vi'), 'vi');
    assert.strictEqual(ApiClient.normalizeLanguage('en'), 'en');
    assert.strictEqual(ApiClient.normalizeLanguage('ko'), 'ko');
    assert.strictEqual(ApiClient.normalizeLanguage('ja'), 'ja');
    assert.strictEqual(ApiClient.normalizeLanguage('zh'), 'zh');
    assert.strictEqual(ApiClient.normalizeLanguage('EN'), 'en');
    assert.strictEqual(ApiClient.normalizeLanguage('JA'), 'ja');
  });

  it('Tự động fallback về "vi" đối với ngôn ngữ không được hỗ trợ (fr, de, unknown)', () => {
    assert.strictEqual(ApiClient.normalizeLanguage('fr'), 'vi');
    assert.strictEqual(ApiClient.normalizeLanguage('de'), 'vi');
    assert.strictEqual(ApiClient.normalizeLanguage(null), 'vi');
  });

  console.log('\n=== KIỂM THỬ 2: CHUẨN HÓA DỮ LIỆU POI ===');
  it('Chuẩn hóa POI đầy đủ từ schema Backend thành cấu trúc UI (p.text[lang], p.lat, p.radius, p.cat)', () => {
    const backendPoi = {
      id: 'poi-1',
      name: 'Chùa Linh Ứng',
      description: 'Mô tả chung',
      latitude: 16.1068,
      longitude: 108.2787,
      category: 'temple',
      address: 'Bãi Bụt',
      activationRadius: 60,
      priority: 10,
      narrations: [
        { language: 'vi', title: 'Chùa Linh Ứng', content: 'Thuyết minh tiếng Việt', durationSeconds: 300 },
        { language: 'en', title: 'Linh Ung Pagoda', content: 'English narration', durationSeconds: 280 }
      ]
    };

    const normalized = ApiClient.normalizePoi(backendPoi);
    assert.strictEqual(normalized.id, 'poi-1');
    assert.strictEqual(normalized.name, 'Chùa Linh Ứng');
    assert.strictEqual(normalized.cat, 'temple');
    assert.strictEqual(normalized.category, 'temple');
    assert.strictEqual(normalized.lat, 16.1068);
    assert.strictEqual(normalized.lng, 108.2787);
    assert.strictEqual(normalized.radius, 60);
    assert.strictEqual(normalized.priority, 10);
    assert.strictEqual(normalized.duration, 5); // 300s / 60 = 5 phút
    assert.deepStrictEqual(normalized.text.vi, ['Chùa Linh Ứng', 'Thuyết minh tiếng Việt']);
    assert.deepStrictEqual(normalized.text.en, ['Linh Ung Pagoda', 'English narration']);
    // Fallback cho ngôn ngữ chưa có bản dịch
    assert.deepStrictEqual(normalized.text.ko, ['Chùa Linh Ứng', 'Thuyết minh tiếng Việt']);
  });

  it('Xử lý an toàn khi POI thiếu narrations (fallback về name & description)', () => {
    const rawPoi = {
      id: 'poi-raw',
      name: 'Điểm thô',
      description: 'Chỉ có mô tả gốc',
      latitude: 16.1,
      longitude: 108.2
    };

    const normalized = ApiClient.normalizePoi(rawPoi);
    assert.strictEqual(normalized.id, 'poi-raw');
    assert.deepStrictEqual(normalized.text.vi, ['Điểm thô', 'Chỉ có mô tả gốc']);
    assert.strictEqual(normalized.duration, 5); // default duration
    assert.strictEqual(normalized.radius, 50); // default activationRadius
  });

  console.log('\n=== KIỂM THỬ 3: CHUẨN HÓA DỮ LIỆU TOUR ===');
  it('Chuẩn hóa Tour và tự động sắp xếp stops theo position asc', () => {
    const backendTour = {
      id: 'tour-1',
      name: 'Tour Toàn Cảnh',
      description: 'Lộ trình khám phá',
      isSuggested: true,
      estimatedMinutes: 45,
      stops: [
        { id: 's2', position: 2, poiId: 'p2', poi: { id: 'p2', name: 'Điểm 2' } },
        { id: 's1', position: 1, poiId: 'p1', poi: { id: 'p1', name: 'Điểm 1' } }
      ]
    };

    const normalized = ApiClient.normalizeTour(backendTour);
    assert.strictEqual(normalized.id, 'tour-1');
    assert.strictEqual(normalized.isSuggested, true);
    assert.strictEqual(normalized.stops[0].position, 1);
    assert.strictEqual(normalized.stops[0].poiId, 'p1');
    assert.strictEqual(normalized.stops[1].position, 2);
    assert.strictEqual(normalized.stops[1].poiId, 'p2');
    assert.deepStrictEqual(normalized.poiIds, ['p1', 'p2']);
  });

  console.log('\n=== KIỂM THỬ 4: CHỐNG TRÙNG LẶP SỰ KIỆN NGHE (DEDUPLICATION) ===');
  await itAsync('Chặn gửi lặp sự kiện nghe liên tiếp cho cùng 1 POI trong vòng 5 giây', async () => {
    // Tạm thời cấu hình BaseURL tới cổng không chạy để test logic debounce
    ApiClient.setBaseUrl('http://127.0.0.1:59999/api');

    const res1 = await ApiClient.recordListeningEvent({
      poiId: 'poi-test-dedup',
      mode: 'AUTO',
      language: 'vi'
    });
    // Lần 1: Được gọi thực sự (dù thất bại mạng)
    assert.strictEqual(res1.duplicate, undefined);

    // Lần 2: Gọi lại ngay lập tức cho cùng poiId, mode, language
    const res2 = await ApiClient.recordListeningEvent({
      poiId: 'poi-test-dedup',
      mode: 'AUTO',
      language: 'vi'
    });
    // Lần 2: Phải bị chặn bởi debounce
    assert.strictEqual(res2.ok, true);
    assert.strictEqual(res2.duplicate, true);

    // Lần 3: Gọi cho POI khác -> Không bị chặn
    const res3 = await ApiClient.recordListeningEvent({
      poiId: 'poi-different',
      mode: 'AUTO',
      language: 'vi'
    });
    assert.strictEqual(res3.duplicate, undefined);
  });

  console.log('\n=== KIỂM THỬ 5: XỬ LÝ KHI BACKEND NGOẠI TUYẾN (FALLBACK & OFFLINE) ===');
  await itAsync('fetchBootstrapData trả về fallback sạch sẽ, đánh dấu isLiveApi = false khi không kết nối được', async () => {
    ApiClient.setBaseUrl('http://127.0.0.1:59999/api'); // Port giả định không có dịch vụ

    const samplePois = [
      { id: 'sample-1', name: 'Điểm mẫu', lat: 16.1, lng: 108.2, text: { vi: ['Tên', 'Nội dung'] } }
    ];

    const result = await ApiClient.fetchBootstrapData(samplePois);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.isLiveApi, false);
    assert.strictEqual(result.source, 'fallback');
    assert.strictEqual(result.pois.length, 1);
    assert.strictEqual(result.pois[0].id, 'sample-1');

    const state = ApiClient.getState();
    assert.strictEqual(state.isLiveApi, false);
    assert.strictEqual(state.source, 'fallback');
    assert(state.lastError !== null);
  });

  await itAsync('fetchGeoCandidates trả về mảng rỗng sạch sẽ khi offline, không làm sập ứng dụng', async () => {
    const result = await ApiClient.fetchGeoCandidates({ lat: 16.1, lng: 108.2, language: 'vi' });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.source, 'offline');
    assert.deepStrictEqual(result.candidates, []);
  });

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`========================================\n`);

  if (failCount > 0) process.exit(1);
}

runTests();
