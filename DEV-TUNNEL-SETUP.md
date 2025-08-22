# Dev Tunnel Setup Guide for Interactive Study Bookshelf

## Current Issue
Port forwarding via dev tunnel is failing. This guide will help you set it up correctly.

## Step-by-Step Solution

### 1. First, Stop Any Running Development Servers
```powershell
# Kill any running node processes (if needed)
Get-Process -Name "node" | Stop-Process -Force

# Or more selectively kill just the Vite process
taskkill /PID 5248 /F
```

### 2. Install/Update VS Code Dev Tunnels Extension
Make sure you have the latest VS Code Dev Tunnels extension installed.

### 3. Start Development Server with Proper Configuration
```powershell
# Start the Vite development server
npm run dev
```

### 4. Set Up Dev Tunnel in VS Code

#### Option A: Using VS Code Command Palette
1. Open VS Code in your project directory
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type "Dev Tunnels: Turn on" and select it
4. Choose "Create New Tunnel"
5. Give it a name (e.g., "booksh
elf-dev")
6. Select "Public" if you want external access, "Private" for just you
7. VS Code will create the tunnel and show you the URL

#### Option B: Using GitHub CLI (if you have it installed)
```powershell
# Create a new tunnel
gh codespace ports forward 5173:5173 --visibility public

# Or using VS Code's built-in tunnel
code tunnel --accept-server-license-terms
```

### 5. Alternative: Manual Dev Tunnel Setup
If the above doesn't work, you can set up dev tunnel manually:

```powershell
# Install dev tunnel CLI (if not already installed)
# This is usually done automatically with VS Code

# Create a tunnel
devtunnel create --allow-anonymous
devtunnel port create -p 5173
devtunnel host
```

### 6. Test the Setup
1. Start your Vite dev server: `npm run dev`
2. You should see output like:
   ```
   Local:   http://localhost:5173/
   Network: http://0.0.0.0:5173/
   Tunnel:  https://xyz-abc.devtunnels.ms/
   ```
3. Use the tunnel URL to access your app externally

## Troubleshooting Common Issues

### Issue 1: Port Already in Use
```powershell
# Find what's using the port
netstat -ano | findstr :5173

# Kill the process (replace PID with actual process ID)
taskkill /PID [PID] /F

# Then restart your dev server
npm run dev
```

### Issue 2: CORS Errors
The `vite.config.ts` I created includes CORS settings. If you still get CORS errors:
```typescript
// Add to vite.config.ts
server: {
  cors: {
    origin: true,
    credentials: true
  }
}
```

### Issue 3: Tunnel Not Accessible
1. Make sure you're signed into the same GitHub account in VS Code
2. Check that the tunnel is set to "Public" if you need external access
3. Verify firewall isn't blocking the connection

### Issue 4: HMR (Hot Reload) Not Working
The config includes HMR settings. If hot reload doesn't work through tunnel:
```typescript
// Add to vite.config.ts
server: {
  hmr: {
    port: 24678,
    clientPort: 443 // Use HTTPS port for tunnels
  }
}
```

## Configuration Files Created

### vite.config.ts
- ✅ Host set to '0.0.0.0' for external access
- ✅ CORS enabled for dev tunnels
- ✅ Proper HMR configuration
- ✅ Strict port settings to avoid conflicts

## Quick Start Commands

```powershell
# 1. Navigate to project directory
cd "C:\Users\shubham\Desktop\Dev\Book-creator"

# 2. Start development server
npm run dev

# 3. In VS Code, open Command Palette (Ctrl+Shift+P)
# 4. Type "Dev Tunnels: Turn on" and follow prompts
```

## Expected Output
After setup, you should see:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
➜  Tunnel:  https://your-tunnel.devtunnels.ms/
➜  press h to show help
```

The tunnel URL is what you'll use for external access to your Interactive Study Bookshelf application.
