import path from 'path';

module.exports = {
  plugins: [
    require(path.resolve(__dirname, 'node_modules/tailwindcss')),
    require(path.resolve(__dirname, 'node_modules/autoprefixer')),
  ]
}
