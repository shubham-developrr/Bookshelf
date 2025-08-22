import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections for dev tunnel
    port: 5174,      // Default Vite port // Don't auto-increment port if 5173 is busy
    cors: true,      // Enable CORS for dev tunnel
    hmr: {
      port: 24678,   // Hot Module Replacement port
      host: 'localhost'
    }
  },
  preview: {
    host: '0.0.0.0', // Allow external connections for preview mode
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@google/genai',
      'groq-sdk'
    ]
  }
})
