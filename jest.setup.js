// A lib/storage.ts importja natív modult húz be; a hivatalos utánzat nélkül
// a teszt már a fájl betöltésén elbukna.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
