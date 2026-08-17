import { isPlausibleBarcode, toProduct } from '../openfoodfacts';

describe('isPlausibleBarcode', () => {
  it('elfogadja a bolti hosszakat', () => {
    expect(isPlausibleBarcode('5999076610013')).toBe(true); // EAN-13
    expect(isPlausibleBarcode('40111213')).toBe(true); // EAN-8
    expect(isPlausibleBarcode('012345678905')).toBe(true); // UPC-A
  });

  it('elutasítja a nem termék-vonalkódokat', () => {
    expect(isPlausibleBarcode('https://example.com')).toBe(false);
    expect(isPlausibleBarcode('12345')).toBe(false);
    expect(isPlausibleBarcode('')).toBe(false);
    expect(isPlausibleBarcode('599907661001X')).toBe(false);
  });
});

describe('toProduct', () => {
  it('a magyar mezőt részesíti előnyben', () => {
    const product = toProduct('123', {
      product_name: 'Milk chocolate',
      product_name_hu: 'Tejcsokoládé',
      ingredients_text: 'sugar, milk',
      ingredients_text_hu: 'cukor, tej',
    });
    expect(product.name).toBe('Tejcsokoládé');
    expect(product.ingredientsText).toBe('cukor, tej');
  });

  it('visszaesik az általános mezőre, ha nincs magyar', () => {
    const product = toProduct('123', { product_name: 'Milk chocolate' });
    expect(product.name).toBe('Milk chocolate');
  });

  it('végső esetben az angol összetevő-mezőt is elfogadja', () => {
    // Külföldi árunál előfordul, hogy csak az `_en` változatba vitték fel.
    const product = toProduct('123', { ingredients_text_en: 'peanuts, milk, soy' });
    expect(product.ingredientsText).toBe('peanuts, milk, soy');
  });

  it('a sorrend: magyar, fő nyelv, angol', () => {
    const product = toProduct('123', {
      ingredients_text: 'sucre, LAIT',
      ingredients_text_en: 'sugar, milk',
    });
    expect(product.ingredientsText).toBe('sucre, LAIT');
  });

  it('az üres sztringet is hiányzónak veszi', () => {
    const product = toProduct('123', { product_name_hu: '   ', product_name: 'Rizs' });
    expect(product.name).toBe('Rizs');
  });

  it('hiányzó mezőkből nem csinál szemetet', () => {
    const product = toProduct('5999076610013', {});
    expect(product).toEqual({
      code: '5999076610013',
      name: null,
      brand: null,
      imageUrl: null,
      quantity: null,
      allergenTags: [],
      traceTags: [],
      labelTags: [],
      analysisTags: [],
      ingredientsText: null,
      ingredientsLang: null,
      // Fordítás csak külön körben készül, az adatbázis válaszában sosincs.
      translation: null,
    });
  });

  it('kiszűri a nem sztring elemeket a címketömbökből', () => {
    const product = toProduct('123', { allergens_tags: ['en:milk', 42, null] });
    expect(product.allergenTags).toEqual(['en:milk']);
  });
});
