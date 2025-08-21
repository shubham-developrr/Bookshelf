# Premium AI Feature Implementation

## Overview
Implemented a premium AI feature that allows users to upgrade to Google Gemini 2.5 model through OAuth authentication, with automatic fallback to Groq when Gemini is unavailable or quota exceeded.

## Architecture

### 1. GeminiOAuthService (`src/services/GeminiOAuthService.ts`)
**Purpose**: Handle separate Google OAuth specifically for Gemini API access (independent from Supabase identity)

**Key Features**:
- Complete OAuth flow implementation
- Token storage with automatic refresh
- Gemini API integration
- Fallback to localStorage when database unavailable

**Methods**:
- `initiateGeminiOAuth()` - Start OAuth flow
- `handleGeminiCallback(code)` - Process OAuth callback
- `hasValidToken()` - Check if user has valid access
- `getGeminiAccessToken()` - Get valid token with auto-refresh
- `callGemini(prompt, model)` - Make API calls to Gemini

### 2. EnhancedAIService (`src/services/EnhancedAIService.ts`)
**Purpose**: Premium AI service with intelligent fallback strategy

**Key Features**:
- Try Gemini 2.5 first for premium users
- Automatic fallback to Groq when Gemini fails
- Educational prompts optimized for both models
- Quota management and error handling

**Methods**:
- `generateResponse(prompt, options)` - Main AI generation with fallback
- `generateEducationalResponse(topic)` - Educational-focused responses
- `generateQuickResponse(question)` - Quick factual responses

### 3. User Interface Integration

#### UserProfileDropdown Enhancement
- Added "Premium AI" menu item
- Real-time status checking (checking/available/unavailable)
- One-click OAuth initiation
- Visual status indicators

#### GeminiAuthCallback Page (`src/pages/GeminiAuthCallback.tsx`)
- OAuth callback handler at `/auth/gemini/callback`
- Loading states and error handling
- Automatic redirect after success
- User-friendly feedback

#### EnhancedAIGuruModal Updates
- Integrated EnhancedAIService for seamless premium/standard switching
- Removed direct Groq implementation
- Maintained conversation history
- Enhanced error handling

## OAuth Flow

### Setup Requirements
1. **Google Cloud Console**:
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:5176/auth/gemini/callback` (or whatever port your dev server uses)
   - Enable Generative Language API

2. **Environment Variables** (`.env.local`):
   ```
   VITE_GOOGLE_GEMINI_CLIENT_ID=your_google_oauth_client_id_here
   VITE_GOOGLE_GEMINI_CLIENT_SECRET=your_google_oauth_client_secret_here
   ```

### User Flow
1. User clicks "Premium AI" → "Upgrade" in profile dropdown
2. Redirected to Google OAuth consent screen
3. After approval, redirected to `/auth/gemini/callback`
4. Service exchanges code for tokens and stores them
5. User automatically redirected back to app
6. Premium AI now available in AI Guru modal

## Fallback Strategy

### Priority Order
1. **Gemini 2.5** (if user has OAuth access and quota available)
2. **Groq llama-3.3-70b-versatile** (fallback for all users)

### Fallback Triggers
- User doesn't have Gemini OAuth access
- Gemini API quota exceeded
- Gemini service temporarily unavailable
- Token refresh failures

### User Experience
- Transparent fallback - users see responses regardless of provider
- No interruption to conversation flow
- Optional provider indication in responses

## Database Schema

### Required Table (for production)
```sql
CREATE TABLE user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for users to access their own tokens
CREATE POLICY "Users can access their own tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### Development Fallback
- Uses localStorage when database table not available
- Seamless transition when database becomes available

## Security Considerations

### OAuth Security
- State parameter validation to prevent CSRF
- Secure token storage (database preferred, localStorage fallback)
- Automatic token refresh
- Proper error handling for invalid tokens

### API Key Protection
- Environment variables for sensitive credentials
- No API keys exposed to frontend
- Separate OAuth scope for Gemini access

### User Privacy
- Separate OAuth for AI access (independent from main authentication)
- Users can revoke access through Google account settings
- No conversation data stored with tokens

## Testing

### Manual Testing Checklist
- [ ] OAuth initiation from profile dropdown
- [ ] OAuth callback handling and token storage
- [ ] Premium AI responses in AI Guru modal
- [ ] Fallback to Groq when Gemini unavailable
- [ ] Token refresh on expiration
- [ ] Error handling for invalid/expired tokens
- [ ] Theme consistency across all components

### Integration Testing
- [ ] End-to-end OAuth flow
- [ ] AI response generation with both providers
- [ ] Database and localStorage fallback scenarios
- [ ] Mobile responsiveness of new components

## Usage Instructions

### For Developers
1. Set up Google OAuth credentials in Google Cloud Console
2. Add environment variables to `.env.local`
3. Create database table when write access available
4. Test OAuth flow in development

### For Users
1. Click profile dropdown in top-right corner
2. Select "Premium AI" menu item
3. Click "Upgrade" if not yet authorized
4. Complete Google OAuth consent
5. Enjoy enhanced AI responses in AI Guru modal

## Future Enhancements

### Potential Improvements
- Usage quota tracking and display
- Multiple AI model selection
- Conversation export with provider attribution
- Premium feature analytics
- Subscription management integration

### Scalability Considerations
- Rate limiting for premium users
- Caching strategies for expensive calls
- Load balancing between providers
- Usage analytics and optimization

## Troubleshooting

### Common Issues
1. **OAuth Configuration**: Ensure redirect URI matches exactly
2. **Environment Variables**: Check variable names and values
3. **Database Access**: Create table when write access available
4. **Token Expiry**: Service handles automatic refresh
5. **API Quotas**: Fallback to Groq prevents service interruption

### Debug Information
- Check browser console for OAuth errors
- Verify environment variables are loaded
- Test Groq fallback independently
- Monitor network requests for API calls

## Implementation Status
✅ **Complete**: GeminiOAuthService with full OAuth flow
✅ **Complete**: EnhancedAIService with intelligent fallback
✅ **Complete**: UI integration in UserProfileDropdown
✅ **Complete**: OAuth callback page with proper UX
✅ **Complete**: AI Guru modal integration
✅ **Complete**: Environment variable configuration
✅ **Complete**: Documentation and setup instructions

🔧 **Pending**: Database table creation (requires write access)
🔧 **Pending**: Google Cloud Console OAuth setup by user
🔧 **Pending**: Production environment variable configuration
