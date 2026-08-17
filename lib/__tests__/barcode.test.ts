import { hasValidChecksum, hasValidLength, inspectBarcode, isDigits } from '../barcode';

describe('hasValidChecksum', () => {
  it('elfogadja a valódi vonalkódokat', () => {
    expect(hasValidChecksum('5449000000996')).toBe(true); // Coca-Cola, EAN-13
    expect(hasValidChecksum('3017620422003')).toBe(true); // Nutella, EAN-13
    expect(hasValidChecksum('034000452996')).toBe(true); // Reese's, UPC-A
    expect(hasValidChecksum('0034000452996')).toBe(true); // ugyanaz vezető nullával
  });

  it('kiszúrja az egyetlen elgépelt számjegyet', () => {
    // Ez a lényeg: kézi beírásnál egy rossz karakter a leggyakoribb hiba.
    expect(hasValidChecksum('5449000000997')).toBe(false);
    expect(hasValidChecksum('5449000010996')).toBe(false);
    expect(hasValidChecksum('3017620422013')).toBe(false);
  });

  it('rossz hosszra vagy nem számjegyre hamis', () => {
    expect(hasValidChecksum('12345')).toBe(false);
    expect(hasValidChecksum('')).toBe(false);
    expect(hasValidChecksum('54490000009X6')).toBe(false);
  });
});

describe('isDigits és hasValidLength', () => {
  it('a bolti hosszakat ismeri', () => {
    expect(hasValidLength('12345678')).toBe(true);
    expect(hasValidLength('123456789012')).toBe(true);
    expect(hasValidLength('1234567890123')).toBe(true);
    expect(hasValidLength('12345678901234')).toBe(true);
    expect(hasValidLength('1234567890')).toBe(false);
  });

  it('csak számjegyet fogad el', () => {
    expect(isDigits('123')).toBe(true);
    expect(isDigits('12a')).toBe(false);
    expect(isDigits(' 123')).toBe(false);
  });
});

describe('inspectBarcode', () => {
  it('a hibákat sorrendben, a legkonkrétabbig adja vissza', () => {
    expect(inspectBarcode('')).toBe('empty');
    expect(inspectBarcode('   ')).toBe('empty');
    expect(inspectBarcode('abc')).toBe('not_digits');
    expect(inspectBarcode('12345')).toBe('bad_length');
    expect(inspectBarcode('5449000000997')).toBe('bad_checksum');
  });

  it('a jó kódra nincs hiba', () => {
    expect(inspectBarcode('5449000000996')).toBeNull();
    expect(inspectBarcode('  5449000000996  ')).toBeNull();
  });
});
