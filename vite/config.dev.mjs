import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../src/shared'),
            '@game': path.resolve(__dirname, '../src/game'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080
    }
});
