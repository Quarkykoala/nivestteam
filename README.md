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

## Hosting the voice bot backend

The voice experience depends on the WebSocket bot defined in [`server.py`](server.py) and [`nivest_bot.py`](nivest_bot.py). Deploy it separately from the Netlify static site and point the frontend to it via `VITE_BOT_WS_URL`.

### Quick deploy on Render

1. Create a new **Web Service** on Render and connect this repository.
2. Render will detect the [`render.yaml`](render.yaml) manifest and provision a Python service.
3. Ensure the start command is `uvicorn server:app --host 0.0.0.0 --port $PORT` (already in the manifest).
4. Add any required bot environment variables (e.g., API keys used by `nivest_bot.py`).
5. After deployment, set `VITE_BOT_WS_URL` in Netlify to `wss://<your-render-service>.onrender.com/ws` so the frontend routes voice traffic to the hosted bot.

For local development you can also run the bot with:

```bash
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Then start the frontend (`npm run dev`) and visit the app; it will connect to `ws://localhost:8000/ws` by default unless `VITE_BOT_WS_URL` is set.

### Deploying to AWS Lambda + API Gateway (WebSocket)

You can host the same FastAPI bot on AWS instead of Render. The repo includes [`aws_lambda_handler.py`](aws_lambda_handler.py), which wraps the FastAPI app with [`Mangum`](https://github.com/jordaneremieff/mangum) so it can run behind API Gateway WebSocket + Lambda.

1. Install dependencies into a build folder and copy the bot files:
   ```bash
   mkdir -p build
   pip install -r requirements.txt -t build
   cp -r server.py nivest_bot.py aws_lambda_handler.py pipecat build/
   ```
2. Zip the contents of `build/` and create a **Python 3.11** Lambda function using `aws_lambda_handler.handler` as the entrypoint. Increase the timeout to at least 30 seconds and allocate sufficient memory for audio work (~1024 MB+).
3. Create an **API Gateway WebSocket API** with the `$default` route integrated with the Lambda (proxy integration). Enable a **$connect** and **$disconnect** route pointing to the same function so Mangum can manage connections. Deploy a stage (e.g., `prod`) and note the `wss://<api-id>.execute-api.<region>.amazonaws.com/prod` URL.
4. If you need CORS restrictions, adjust the API Gateway route settings; Mangum will honor them through the FastAPI middleware.
5. In Netlify (or your frontend host), set `VITE_BOT_WS_URL` to the WebSocket URL from step 3 so the frontend connects to the Lambda-hosted bot.

To test locally with API Gateway before deploying, you can use [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html) with a simple `AWS::Serverless::Function` that points to `aws_lambda_handler.handler` and an `Api` event of type `WebSocket` on the `/ws` route.
