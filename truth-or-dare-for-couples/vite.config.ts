import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {viteObfuscateFile} from 'vite-plugin-obfuscator';

const CARD_OBFUSCATION_OPTIONS = {
  stringArray: true,
  stringArrayEncoding: ['base64'],
  rotateStringArray: true,
  selfDefending: false,
  // Keep build output compatible with modern browsers while avoiding the
  // heavier control-flow transforms that are unnecessary for card copy.
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
};

export default defineConfig(({command}) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // The card catalog is bundled into the production client chunk. This
      // plugin runs only for `vite build`; dev/HMR stays readable and fast.
      ...(command === 'build' ? [viteObfuscateFile(CARD_OBFUSCATION_OPTIONS)] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled in constrained development environments.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
