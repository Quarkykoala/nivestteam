<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1PEtN1q20bk8_BfXnSIrTH0eNa0LYKoXM

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying to Netlify with Supabase

1. Create a Supabase project and add two tables:
   - **conversations**: `id (uuid)`, `created_at (timestamp)`, `user_phone (text)`, `prompt (text)`, `response (text)`, `context (jsonb)`.
   - **financial_snapshots**: `id (uuid)`, `captured_at (timestamp)`, `user_phone (text)`, `reason (text)`, `summary (jsonb)`, `transactions (jsonb)`, `goals (jsonb)`.
2. Add the following environment variables in your Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BOT_WS_URL` (optional, overrides the default WebSocket endpoint)
   - `VITE_GEMINI_API_KEY`
3. Deploy to Netlify. The included `netlify.toml` already sets the build command (`npm run build`) and publish directory (`dist`).
4. Each voice command will be captured in Supabase with the related financial context, and snapshots of transactions/goals are stored for building dashboards.
