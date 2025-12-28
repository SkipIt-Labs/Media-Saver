import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'main/index': 'src/main/index.ts'
    },
    platform: 'node',
    target: 'node20',
    format: ['cjs'],
    sourcemap: true,
    clean: true,
    outDir: 'dist-electron',
    external: ['electron']
  },
  {
    entry: {
      'preload/index': 'src/preload/index.ts'
    },
    platform: 'node',
    target: 'node20',
    format: ['cjs'],
    sourcemap: true,
    clean: false,
    outDir: 'dist-electron',
    external: ['electron']
  },
  {
    entry: {
      'main/download/worker': 'src/main/download/worker.ts'
    },
    platform: 'node',
    target: 'node20',
    format: ['cjs'],
    sourcemap: true,
    clean: false,
    outDir: 'dist-electron',
    external: ['electron']
  }
]);



