# Deployment Guide

This document explains how to deploy EchoCards to GitHub Pages using GitHub Actions.

## Automatic Deployment

The application is automatically deployed to GitHub Pages when you push to the `main` branch.

### Setup Steps

#### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the changes

#### 2. Add Gemini API Key Secret

The application requires a Gemini API key to function. You need to add it as a repository secret:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: Your Gemini API key from https://aistudio.google.com/apikey
6. Click **Add secret**

#### 3. Deploy

Once configured, deployment happens automatically:

- **Push to main branch**: Triggers automatic deployment
- **Manual deployment**: Go to **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

The deployed site will be available at:
```
https://matheus-rech.github.io/gemini-flashcards-voice/
```

## Workflow Details

The deployment workflow (`.github/workflows/deploy.yml`) does the following:

1. **Build Job**:
   - Checks out the repository
   - Sets up Node.js 20
   - Installs dependencies with `npm ci`
   - Builds the application with `npm run build`
   - Uploads the `dist/` folder as an artifact

2. **Deploy Job**:
   - Downloads the build artifact
   - Deploys to GitHub Pages

## Local Development

For local development, the app runs without the GitHub Pages base path:

```bash
npm run dev
# Opens at http://localhost:3000
```

For production builds locally:

```bash
npm run build
# Builds to dist/ with GitHub Pages base path
```

## Important Notes

### API Key Security

- **Never commit your API key to the repository**
- The API key is injected at build time from GitHub Secrets
- Users visiting your deployed site will need to provide their own API key (you can add a settings UI for this)

### CORS and API Limitations

- The Gemini API is called directly from the browser
- Users must have their own API key to use the app
- Consider implementing a backend proxy if you want to hide the API key

## Troubleshooting

### Deployment fails with "GEMINI_API_KEY not found"
- Make sure you've added the `GEMINI_API_KEY` secret in repository settings
- The secret name must match exactly (case-sensitive)

### 404 errors after deployment
- Verify that GitHub Pages is enabled and set to use GitHub Actions
- Check that the `base` path in `vite.config.ts` matches your repository name

### Build succeeds but app doesn't work
- Check browser console for errors
- Verify that the API key is correctly configured
- Ensure all assets are loading from the correct base path

## Alternative Deployment Options

While this guide focuses on GitHub Pages, you can also deploy to:

- **Vercel**: Connect your GitHub repo at vercel.com
- **Netlify**: Connect your GitHub repo at netlify.com
- **Cloudflare Pages**: Connect your GitHub repo at pages.cloudflare.com

All of these platforms support automatic deployments from GitHub and can inject environment variables securely.
