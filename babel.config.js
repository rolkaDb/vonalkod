// A Metro alapból konfiguráció nélkül is elboldogul, a jest-expo viszont
// ebből a fájlból veszi a transzformációt – enélkül a react-native saját
// Flow-típusos forrásain elhasal a parser.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
