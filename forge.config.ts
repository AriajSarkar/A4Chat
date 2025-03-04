import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    icon: './assets/icons/icon',
    asar: true
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      authors: 'Ariaj Sarkar',
      iconUrl: 'https://raw.githubusercontent.com/AriajSarkar/A4Chat/main/assets/icons/icon.ico',
      setupIcon: './assets/icons/icon.ico'
    }, ['win32']),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({}, ['linux']),
    new MakerRpm({
      options: {
        name: 'A4Chat',
        productName: 'A4Chat',
        genericName: 'Chat Application',
        description: 'A simple chat application built with Electron',
        version: '1.0.0',
        license: 'MIT',
        group: 'Applications/Internet',
        categories: ['Network', 'Utility']
      }
    }, ['linux'])
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/app.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
  ],
};

export default config;
