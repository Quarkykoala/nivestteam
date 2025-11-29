#!/usr/bin/env bash
set -euo pipefail

# Usage:
# AWS_ROLE_ARN, FUNCTION_NAME and AWS_REGION are required environment variables.
# Optionally set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN (or NETLIFY_AUTH_TOKEN env) to auto-set Netlify env.

echo "Starting Lambda + API Gateway WebSocket deploy script"

if [ -z "${FUNCTION_NAME:-}" ] || [ -z "${AWS_REGION:-}" ]; then
  echo "ERROR: Please set FUNCTION_NAME and AWS_REGION environment variables." >&2
  exit 2
fi

# If no role provided, create a minimal Lambda execution role
if [ -z "${AWS_ROLE_ARN:-}" ]; then
  ROLE_NAME="${FUNCTION_NAME}-role"
  echo "No AWS_ROLE_ARN provided — creating IAM role $ROLE_NAME with AWSLambdaBasicExecutionRole attached"
  cat > /tmp/trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  set +e
  aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1
  if [ $? -ne 0 ]; then
    aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file:///tmp/trust-policy.json
    aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    echo "Created role $ROLE_NAME"
  else
    echo "Role $ROLE_NAME already exists; reusing"
  fi
  set -e

  # wait briefly for eventual consistency
  sleep 5
  AWS_ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)
  echo "Using role ARN: $AWS_ROLE_ARN"
fi

BUILD_DIR=build
ZIP_FILE=package.zip

echo "Cleaning and creating build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "Preparing requirements for packaging"
# Create a temporary requirements file but filter out VCS installs and known-broken/pyproject-mismatch packages.
TMP_REQ=$(mktemp)
# packages known to produce packaging/metadata errors when fetched from PyPI during wheel build
SKIP_PATTERN='pipecat-ai-small-webrtc-prebuilt|pipecat_ai_flows|pipecat-ai-flows'
grep -v "^git+" backend/requirements.txt | grep -vE "$SKIP_PATTERN" > "$TMP_REQ"

echo "Installing Python dependencies into $BUILD_DIR (excluding git+ and known-broken packages)"
if ! pip install -r "$TMP_REQ" -t "$BUILD_DIR"; then
  echo "Warning: some packages failed to install from PyPI; continuing and attempting best-effort packaging." >&2
fi

# Try to install local copies of pipecat-ai-flows if available in the repo
if [ -d "src/pipecat-ai-flows" ]; then
  echo "Found local src/pipecat-ai-flows — installing into package folder"
  pip install ./src/pipecat-ai-flows -t "$BUILD_DIR" || echo "Warning: local pipecat-ai-flows install failed" >&2
fi

# pipecat-ai-small-webrtc-prebuilt has inconsistent metadata on PyPI (name mismatch). If a local wheel or folder
# exists, install it; otherwise skip and warn the user to provide a wheel or editable source.
if [ -d "src/pipecat-ai-small-webrtc-prebuilt" ]; then
  echo "Installing local pipecat-ai-small-webrtc-prebuilt"
  pip install ./src/pipecat-ai-small-webrtc-prebuilt -t "$BUILD_DIR" || echo "Warning: local small-webrtc-prebuilt install failed" >&2
else
  echo "Notice: skipping pipecat-ai-small-webrtc-prebuilt due to upstream metadata mismatch. If this package is required in Lambda, provide a local wheel or source in src/ or update backend/requirements.txt to a compatible package." >&2
fi

rm -f "$TMP_REQ"

echo "Copying application files..."
cp -r server.py nivest_bot.py aws_lambda_handler.py pipecat "$BUILD_DIR/" || true

pushd "$BUILD_DIR" >/dev/null
echo "Creating zip package $ZIP_FILE"
rm -f ../$ZIP_FILE
zip -r9 ../$ZIP_FILE .
popd >/dev/null

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Using AWS account: $ACCOUNT_ID"

set +e
aws lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1
EXISTS=$?
set -e

if [ "$EXISTS" -eq 0 ]; then
  echo "Updating existing Lambda function code: $FUNCTION_NAME"
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file fileb://$ZIP_FILE
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --handler aws_lambda_handler.handler --runtime python3.11 --timeout 30 --memory-size 1024 || true
else
  echo "Creating new Lambda function: $FUNCTION_NAME"
  aws lambda create-function --function-name "$FUNCTION_NAME" \
    --runtime python3.11 \
    --role "$AWS_ROLE_ARN" \
    --handler aws_lambda_handler.handler \
    --zip-file fileb://$ZIP_FILE \
    --timeout 30 \
    --memory-size 1024
fi

# Create WebSocket API
API_NAME="${FUNCTION_NAME}-ws-api"
echo "Creating WebSocket API: $API_NAME"
API_ID=$(aws apigatewayv2 create-api --name "$API_NAME" --protocol-type WEBSOCKET --route-selection-expression '$request.body.action' --query ApiId --output text)
echo "API ID: $API_ID"

LAMBDA_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --query 'Configuration.FunctionArn' --output text)
INTEGRATION_URI="arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

echo "Creating integration between API and Lambda..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id "$API_ID" --integration-type AWS_PROXY --integration-uri "$INTEGRATION_URI" --payload-format-version 2.0 --query IntegrationId --output text)

echo "Creating routes: \$connect, \$disconnect and \$default"
aws apigatewayv2 create-route --api-id "$API_ID" --route-key "\$connect" --target "integrations/$INTEGRATION_ID" >/dev/null
aws apigatewayv2 create-route --api-id "$API_ID" --route-key "\$disconnect" --target "integrations/$INTEGRATION_ID" >/dev/null
aws apigatewayv2 create-route --api-id "$API_ID" --route-key "\$default" --target "integrations/$INTEGRATION_ID" >/dev/null

echo "Deploying API"
DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment --api-id "$API_ID" --query DeploymentId --output text)
aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name prod --deployment-id "$DEPLOYMENT_ID" --auto-deploy

echo "Granting API Gateway permission to invoke Lambda"
SOURCE_ARN="arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*/*"
aws lambda add-permission --function-name "$FUNCTION_NAME" --statement-id apigw-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "$SOURCE_ARN" || true

WSS_URL="wss://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod"
echo "WebSocket URL: $WSS_URL"

if [ -n "${NETLIFY_SITE_ID:-}" ] && ( [ -n "${NETLIFY_AUTH_TOKEN:-}" ] || [ -n "${NETLIFY_TOKEN:-}" ] ); then
  echo "Setting Netlify environment variable VITE_BOT_WS_URL to $WSS_URL"
  # prefer NETLIFY_AUTH_TOKEN or NETLIFY_TOKEN
  NETLIFY_TOKEN=${NETLIFY_AUTH_TOKEN:-${NETLIFY_TOKEN:-}}
  # Requires `netlify` CLI installed and NETLIFY_AUTH_TOKEN env var set
  NETLIFY_AUTH_TOKEN="$NETLIFY_TOKEN" netlify env:set VITE_BOT_WS_URL "$WSS_URL" --site "$NETLIFY_SITE_ID"
  echo "Netlify env set (if CLI and token available)."
else
  echo "NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN not provided; skipping Netlify update. Please set VITE_BOT_WS_URL=$WSS_URL in your frontend host (Netlify/other)."
fi

echo "Done."
