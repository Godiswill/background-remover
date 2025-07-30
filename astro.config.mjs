// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

function requestAdapterInfoDev() {
  return {
    name: 'replace-requestAdapterInfoDev',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      // if (/await\s+(\w+)\.requestAdapterInfo\(\)/.test(code)) {
      if (/@imgly_background-removal\.js/.test(id)) {
        console.log(id);
        const replaced = code.replace(
          /await\s+(\w+)\.requestAdapterInfo\(\)/g,
          `$1.info`
        );
        return {
          code: replaced,
          map: null,
        };
      }
    },
  };
}

function requestAdapterInfoBuild() {
  return {
    name: 'replace-requestAdapterInfoBuild',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (/ort\.webgpu\.min\.js$/.test(id)) {
        console.log(id);
        const replaced = code.replace(
          /await\s+(\w+)\.requestAdapterInfo\(\)/g,
          // `$1.requestAdapterInfo?await $1.requestAdapterInfo():$1.info||{vendor:'unknown',architecture:'unknown',description:'shim'}`
          `$1.info`
        );
        return {
          code: replaced,
          map: null,
        };
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://bgg.one',
  markdown: {
    shikiConfig: {
      theme: 'andromeeda',
    },
  },
  integrations: [react(), sitemap()],

  vite: {
    plugins: [
      tailwindcss(),
      // requestAdapterInfoDev(),
      // requestAdapterInfoBuild(),
    ],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  },
});
