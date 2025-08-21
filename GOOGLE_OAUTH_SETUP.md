# Google Cloud Console OAuth Setup

## Problem
Getting OAuth error: "redirect_uri_mismatch" when trying to use Premium AI feature.

## Solution
You need to add the correct redirect URI to your Google Cloud Console OAuth configuration.

## Step-by-Step Fix

### 1. Go to Google Cloud Console
- Open: https://console.cloud.google.com/apis/credentials
- Find your OAuth 2.0 Client ID: `650464924969-j720oiu5c307gdlt8k56cf0fd801aq3i.apps.googleusercontent.com`

### 2. Edit OAuth Client
- Click the **Edit** button (pencil icon) next to your OAuth client
- Scroll down to **"Authorized redirect URIs"**

### 3. Add These Redirect URIs
Add ALL of these URIs to handle different development scenarios:

```
http://localhost:5174/auth/gemini/callback
http://localhost:5176/auth/gemini/callback
http://127.0.0.1:5174/auth/gemini/callback
http://127.0.0.1:5176/auth/gemini/callback
```

### 4. Save Changes
- Click **"SAVE"** at the bottom of the page
- Wait for changes to propagate (usually instant)

### 5. Test the Feature
1. Go to: http://localhost:5174
2. Sign in to your account
3. Click your profile dropdown (top-right)
4. Click "Premium AI" → "Upgrade"
5. Should now work without redirect URI errors

## Why This Happens
- Vite development server can start on different ports (5174, 5176, etc.)
- The OAuth redirect URI is built dynamically: `${window.location.origin}/auth/gemini/callback`
- Google requires exact URI matches in the OAuth configuration
- Adding multiple URIs ensures it works regardless of which port Vite chooses

## Current OAuth Client Details
- **Client ID**: `650464924969-j720oiu5c307gdlt8k56cf0fd801aq3i.apps.googleusercontent.com`
- **Required Redirect URIs**: See list above
- **Required API**: Generative Language API (should already be enabled)

## Verification
After adding the URIs, you should see logs in the browser console when testing:
```
🔧 Initiating Gemini OAuth with redirect URI: http://localhost:5174/auth/gemini/callback
🔗 OAuth URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

The redirect URI in the log should match one of the URIs you added to Google Cloud Console.
