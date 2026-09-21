import { tidy } from '../ocr';

describe('tidy', () => {
  it('a sortöréseket szóközre cseréli', () => {
    // A csomagoláson több sorba tördelve áll a lista, de egyetlen felsorolás.
    expect(tidy('búzaliszt,\ncukor,\nsó')).toBe('búzaliszt, cukor, só');
  });

  it('összevonja a többszörös szóközt', () => {
    expect(tidy('cukor,     só')).toBe('cukor, só');
  });

  it('a Windows-féle sorvégeket is kezeli', () => {
    expect(tidy('tejpor\r\ncukor')).toBe('tejpor cukor');
  });

  it('levágja a széleket', () => {
    expect(tidy('\n  cukor, só  \n')).toBe('cukor, só');
  });

  it('üres bemenetre üres sztringet ad', () => {
    expect(tidy('')).toBe('');
    expect(tidy('\n\n   \n')).toBe('');
  });

  it('nem bántja a már rendben lévő szöveget', () => {
    const text = 'búzaliszt (55%), sovány tejpor, só';
    expect(tidy(text)).toBe(text);
  });
});
