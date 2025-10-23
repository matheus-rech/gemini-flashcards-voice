# Secure Deployment Guide for EchoCards

## Table of Contents
1. [GitHub Pages Compatibility](#github-pages-compatibility)
2. [The API Key Security Problem](#the-api-key-security-problem)
3. [Deployment Solutions](#deployment-solutions)
4. [Recommended Architecture](#recommended-architecture)

---

## GitHub Pages Compatibility

### WebSocket Support: ✅ YES, it works!

**Common misconception:** "GitHub Pages can't handle WebSockets because it's static hosting."

**Reality:** GitHub Pages works perfectly for WebSocket-based apps because:

```
┌─────────────────┐
│  GitHub Pages   │  Serves static HTML/CSS/JS
│  (Static Host)  │
└────────┬────────┘
         │ Downloads app
         ↓
┌─────────────────┐
│   User Browser  │  Runs JavaScript
└────────┬────────┘
         │ Opens WebSocket directly
         ↓
┌─────────────────┐
│  Google Gemini  │  WebSocket server
│   Live API      │  (wss://generativelanguage.googleapis.com)
└─────────────────┘
```

**GitHub Pages doesn't need to handle WebSockets** because:
- Your app makes WebSocket connections to **Google's servers**, not your host
- GitHub Pages only serves files
- All real-time communication bypasses GitHub entirely

**Requirements (all satisfied):**
- ✅ HTTPS (GitHub Pages provides)
- ✅ WebSocket support (all modern browsers)
- ✅ Microphone access (HTTPS + user permission)

---

## The API Key Security Problem

### Current Configuration: 🚨 INSECURE

**vite.config.ts:**
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

**What happens at build time:**
```javascript
// Your source code:
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// After Vite build:
const ai = new GoogleGenAI({ apiKey: "AIzaSyC_YOUR_ACTUAL_KEY_1234567890" });
```

### The Vulnerability

**Anyone can steal your API key:**

1. Visit `https://matheus-rech.github.io/gemini-flashcards-voice/`
2. Open DevTools (F12) → Sources tab
3. Search for "GoogleGenAI" or "apiKey"
4. Find: `apiKey: "AIzaSyC_YOUR_KEY"`
5. Copy and use on their own projects
6. **You pay for their usage!** 💸

### Why This Matters

**Gemini API costs:**
- Free tier: 15 requests/minute, 1,500 requests/day
- After that: You pay per token
- A malicious user could drain your quota or run up charges

---

## Deployment Solutions

### Solution 1: User-Provided API Keys (Simplest) ⭐ RECOMMENDED for personal use

**Approach:** Remove your API key from the build. Users provide their own.

**Implementation:**

#### 1. Update geminiService.ts

```typescript
// services/geminiService.ts

// Remove hardcoded API key
let ai: GoogleGenAI | null = null;
let userApiKey: string | null = null;

export const setApiKey = (key: string) => {
  userApiKey = key;
  ai = null; // Reset AI instance
  localStorage.setItem('gemini_api_key', key);
};

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem('gemini_api_key');
};

const getAi = () => {
  if (!ai) {
    if (!userApiKey && !getStoredApiKey()) {
      throw new Error('API key not configured. Please set your Gemini API key.');
    }
    ai = new GoogleGenAI({
      apiKey: userApiKey || getStoredApiKey()!
    });
  }
  return ai;
};
```

#### 2. Create API Key Settings Component

```typescript
// components/ApiKeySettings.tsx

import React, { useState } from 'react';
import { setApiKey, getStoredApiKey } from '../services/geminiService';

const ApiKeySettings: React.FC = () => {
  const [key, setKey] = useState(getStoredApiKey() || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setApiKey(key);
    alert('API key saved successfully!');
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Gemini API Key</h3>
      <p className="text-sm text-gray-400 mb-4">
        Get your free API key from{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline"
        >
          Google AI Studio
        </a>
      </p>

      <div className="flex gap-2">
        <input
          type={showKey ? 'text' : 'password'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="flex-1 px-3 py-2 bg-gray-700 rounded"
        />
        <button
          onClick={() => setShowKey(!showKey)}
          className="px-3 py-2 bg-gray-600 rounded"
        >
          {showKey ? '🙈' : '👁️'}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 rounded font-semibold"
        >
          Save
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        ⚠️ Your API key is stored locally in your browser and never sent to our servers.
      </p>
    </div>
  );
};

export default ApiKeySettings;
```

#### 3. Update vite.config.ts

```typescript
// Remove API key from build
export default defineConfig(({ mode }) => {
  return {
    base: '/gemini-flashcards-voice/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Remove this block entirely:
    // define: {
    //   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    // },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
```

**Pros:**
- ✅ Zero cost to you
- ✅ Each user controls their own quota
- ✅ Simple to implement
- ✅ Works on any static host

**Cons:**
- ❌ Users need to get an API key (friction)
- ❌ Non-technical users may struggle
- ❌ Less polished UX

---

### Solution 2: Backend Proxy with Serverless Functions ⭐ RECOMMENDED for production

**Approach:** Use Vercel/Netlify Edge Functions to proxy requests securely.

**Architecture:**

```
Browser → Edge Function (holds API key) → Gemini API
  ↑                                           ↓
  └────────── WebSocket Response ─────────────┘
```

**Implementation (Vercel Example):**

#### 1. Create Edge Function

```typescript
// api/gemini-proxy.ts

import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Verify request origin to prevent abuse
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://your-domain.vercel.app',
    'http://localhost:3000'
  ];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Rate limiting (simple example)
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  // TODO: Implement rate limiting per IP

  try {
    // API key stored securely in Vercel environment variables
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Parse request
    const { action, params } = await req.json();

    // Proxy the request
    if (action === 'connect-live') {
      // Note: WebSocket proxying is complex
      // May need to use Server-Sent Events instead
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
```

**Challenge:** WebSocket connections are hard to proxy through serverless functions.

**Better Alternative:** Use Vercel/Netlify but have users provide their own API keys (Solution 1).

**Pros:**
- ✅ API key stays secure
- ✅ You control access
- ✅ Can implement rate limiting
- ✅ Professional UX

**Cons:**
- ❌ Complex WebSocket proxying
- ❌ Serverless function costs
- ❌ You pay for all usage
- ❌ Requires backend infrastructure

---

### Solution 3: Hybrid Approach ⭐ BEST OF BOTH WORLDS

**Approach:** Deploy on Vercel/Netlify with optional user-provided keys.

**Flow:**
```
User visits app
  ↓
Has API key? → YES → Use their key (free for you)
  ↓
 NO
  ↓
Use demo mode with your key (rate-limited)
```

**Implementation:**

```typescript
// services/geminiService.ts

const getAi = () => {
  // Check for user's API key first
  const userKey = localStorage.getItem('gemini_api_key');

  if (userKey) {
    return new GoogleGenAI({ apiKey: userKey });
  }

  // Fallback to demo mode (limited usage)
  // Call your serverless function that proxies with rate limits
  return createProxiedAI();
};
```

**Pros:**
- ✅ Works immediately for new users (demo)
- ✅ Power users can use their own keys
- ✅ Controlled costs
- ✅ Best UX

**Cons:**
- ❌ Most complex to implement
- ❌ Still need backend for demo mode

---

## Recommended Architecture

### For Your Use Case: **Solution 1 (User-Provided Keys)**

**Why:**
1. ✅ **You mentioned it's a personal project** - Users who need it can get a free API key
2. ✅ **Zero hosting costs** - Works on GitHub Pages
3. ✅ **Zero API costs** - Each user pays for their own usage
4. ✅ **Simple to maintain** - No backend complexity
5. ✅ **Educational value** - Users learn about AI APIs

**Implementation Steps:**

1. **Update geminiService.ts** - Add API key management
2. **Create ApiKeySettings component** - UI for entering key
3. **Update App.tsx** - Show settings if no key present
4. **Remove API key from vite.config.ts** - Security fix
5. **Update DEPLOYMENT.md** - Document new setup process

### Deployment Platform Comparison

| Platform | WebSocket | Edge Functions | Cost | Complexity |
|----------|-----------|----------------|------|------------|
| **GitHub Pages** | ✅ (client-side) | ❌ | Free | Simple |
| **Vercel** | ✅ | ✅ | Free tier → Paid | Medium |
| **Netlify** | ✅ | ✅ | Free tier → Paid | Medium |
| **Cloudflare Pages** | ✅ | ✅ (Workers) | Free tier → Paid | Medium |

**All support WebSockets from the client side!**

---

## Summary

### Key Insights

1. **WebSockets work fine on GitHub Pages** ✅
   - Static hosting is sufficient
   - Browser connects directly to Google

2. **API key security is the real concern** 🚨
   - Current config embeds key in JavaScript
   - Anyone can steal it

3. **Best solution for you: User-provided API keys** ⭐
   - Remove your key from the build
   - Users provide their own (free from Google)
   - Deploy safely on GitHub Pages

### Next Steps

Would you like me to implement **Solution 1** (user-provided API keys)? This would:
- Remove API key from the build
- Add a settings UI for users to enter their key
- Update deployment workflow
- Ensure secure deployment on GitHub Pages

This keeps your free GitHub Pages deployment while solving the security issue!
