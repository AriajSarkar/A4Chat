import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import path from 'path';

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-inline' http://localhost:11434",
        "connect-src 'self' http://localhost:11434",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'"
      ].join('; ')
    }
  }
};
