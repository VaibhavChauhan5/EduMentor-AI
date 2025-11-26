import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Gzip compression
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
        }),
        // Brotli compression (better compression than gzip)
        viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
        }),
    ],
    base: './', // Use relative paths for Amplify deployment
    build: {
        outDir: 'dist',
        assetsDir: '',  // Put assets in root instead of assets folder
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.logs in production
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                // Code splitting - separate vendor chunks for better caching
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'styled-vendor': ['styled-components'],
                },
                assetFileNames: '[name].[hash].[ext]',
                chunkFileNames: '[name].[hash].js',
                entryFileNames: '[name].[hash].js',
            },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
})