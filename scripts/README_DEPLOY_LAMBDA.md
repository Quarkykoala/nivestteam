# Deploy Lambda + API Gateway WebSocket (automation)

This folder contains a script to package the Python backend and deploy it to AWS Lambda with an API Gateway WebSocket frontend. It also can optionally set the Netlify environment variable `VITE_BOT_WS_URL` so the frontend will connect to the deployed bot.

Prerequisites
- AWS CLI v2 configured and authenticated with an account that can create Lambda and API Gateway resources.
- An IAM role ARN with trust policy allowing Lambda and necessary permissions (used for creating the function): set this value into `AWS_ROLE_ARN`.
- `FUNCTION_NAME` - name to use for the Lambda function.
- `AWS_REGION` - AWS region to deploy to (e.g., us-west-2).
- `pip` available and able to install dependencies from `backend/requirements.txt`.
- (Optional) `netlify` CLI and a Netlify site ID + auth token to set the Netlify env var automatically.

How to run

1. From the repo root, on WSL or macOS/Linux:

```bash
export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/my-lambda-role"
export FUNCTION_NAME="nivest-voice-bot"
export AWS_REGION="us-west-2"
# optional: export NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN to set frontend env automatically
bash scripts/deploy_lambda.sh
```

2. The script will print the WebSocket URL, e.g.:

```
wss://<api-id>.execute-api.<region>.amazonaws.com/prod
```

3. Set this URL as the frontend `VITE_BOT_WS_URL` environment variable in Netlify (or your host). On Netlify you can set it in the UI, or use `netlify env:set VITE_BOT_WS_URL "wss://..." --site <site-id>`.

Notes and caveats
- The script will attempt to create a new WebSocket API each run. If you want a single API reused across deploys, modify the script to detect and reuse an existing `API_ID`.
- Creating IAM roles, policies, and permissions is out of scope for the script; supply a role that already has the necessary permissions.
- The script assumes `aws` CLI is authorized; if your environment uses AWS SSO or profiles, adjust the AWS CLI config or export `AWS_PROFILE`.

If you'd like, I can run this script now if you provide the required AWS_ROLE_ARN, FUNCTION_NAME, and AWS_REGION (and confirm you want me to perform the deployment from this environment). Alternatively, I can open a PR with these new scripts and docs and push them to a branch for you to run locally or in CI.
