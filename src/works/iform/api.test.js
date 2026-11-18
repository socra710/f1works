import { saveTemplate } from './api';

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('reports failure when the template API rejects the save', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    statusText: 'Forbidden',
  });

  const result = await saveTemplate({
    templateId: 'ILLEGAL_SOFTWARE_PLEDGE',
    title: '불법 소프트웨어 사용 금지 서약서',
    version: '1.0',
  });

  expect(result.ok).toBe(false);
});
