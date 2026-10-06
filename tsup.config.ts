import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/render.ts',
    'src/export.ts',
    'src/crop.ts',
    'src/background-removal.ts',
    'src/psd-layers.ts',
  ],
  format: ['esm', 'cjs'],
  dts: {
    // tsup's declaration build sets `baseUrl`, which TypeScript 6 deprecates.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  platform: 'browser',
  splitting: false,
  treeshake: true,
});
