import { ChatbotService } from '../src/chatbot/chatbot.service.js';
describe('ChatbotService', () => {
  it('returns a clearly identified fallback reply', () => {
    const response = new ChatbotService().reply({ message: 'Giờ mở cửa?' });
    expect(response.provider).toBe('local-fallback');
  });
});
