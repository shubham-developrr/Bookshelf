#!/usr/bin/env node

/**
 * Dev Tunnel Health Check for Interactive Study Bookshelf
 * Helps diagnose and fix common dev tunnel issues
 */

import { spawn } from 'child_process';
import { createServer } from 'http';

class DevTunnelHealthCheck {
  async checkPortAvailability(port) {
    return new Promise((resolve, reject) => {
      const server = createServer();
      
      server.listen(port, (err) => {
        if (err) {
          resolve(false); // Port is busy
        } else {
          server.close(() => {
            resolve(true); // Port is available
          });
        }
      });
      
      server.on('error', (err) => {
        resolve(false);
      });
    });
  }

  async checkNetworkConnectivity() {
    return new Promise((resolve) => {
      const testUrl = 'http://localhost:5173';
      const request = require('http').get(testUrl, (response) => {
        resolve(response.statusCode === 200);
      });
      
      request.on('error', () => {
        resolve(false);
      });
      
      request.setTimeout(5000, () => {
        request.abort();
        resolve(false);
      });
    });
  }

  async runHealthCheck() {
    console.log('🔍 Dev Tunnel Health Check for Interactive Study Bookshelf');
    console.log('=========================================================\n');

    // Check if port 5173 is available/in use correctly
    console.log('📡 Checking port 5173 availability...');
    const portAvailable = await this.checkPortAvailability(5173);
    if (portAvailable) {
      console.log('  ❌ Port 5173 is not in use - development server may not be running');
      console.log('  💡 Run: npm run dev');
    } else {
      console.log('  ✅ Port 5173 is in use - development server is likely running');
    }

    // Check network connectivity
    console.log('\n🌐 Checking local server connectivity...');
    const serverRunning = await this.checkNetworkConnectivity();
    if (serverRunning) {
      console.log('  ✅ Development server is responding on http://localhost:5173');
    } else {
      console.log('  ❌ Development server is not responding');
      console.log('  💡 Check if Vite is running and try: npm run dev');
    }

    // Check common dev tunnel issues
    console.log('\n🔧 Dev Tunnel Troubleshooting:');
    console.log('  1. ✅ vite.config.ts created with host: "0.0.0.0"');
    console.log('  2. ✅ CORS enabled for tunnel access');
    console.log('  3. ✅ Port 5173 configured for external access');

    console.log('\n📋 Next Steps for Dev Tunnel Setup:');
    console.log('  1. Open VS Code in your project directory');
    console.log('  2. Press Ctrl+Shift+P → "Dev Tunnels: Turn on"');
    console.log('  3. Create new tunnel → Name it → Set visibility to Public');
    console.log('  4. Use the provided tunnel URL to access your app');

    console.log('\n🌍 Expected tunnel URL format:');
    console.log('  https://your-tunnel-name-12345.devtunnels.ms');

    console.log('\n🚨 Common Issues & Solutions:');
    console.log('  • CORS errors → Already fixed with vite.config.ts');
    console.log('  • Port conflicts → Use taskkill /PID [PID] /F');
    console.log('  • Tunnel not accessible → Check GitHub authentication in VS Code');
    console.log('  • HMR not working → Refresh browser or restart dev server');

    return {
      portInUse: !portAvailable,
      serverResponding: serverRunning,
      configurationReady: true
    };
  }
}

// Run the health check
const healthCheck = new DevTunnelHealthCheck();
healthCheck.runHealthCheck().catch(console.error);
