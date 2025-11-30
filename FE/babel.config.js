module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Các plugin khác nếu có...
      
      // CHỈ CẦN DÒNG NÀY (và phải ở cuối cùng):
      ['react-native-reanimated/plugin', {
        relativeSourceLocation: true,
      }],
    ],
  };
};