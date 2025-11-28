import os
import sys
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

# Add local pipecat source to sys.path to ensure we can import it
# even if pip install -e failed or wasn't run.
current_dir = os.path.dirname(os.path.abspath(__file__))
pipecat_src = os.path.join(current_dir, "pipecat", "src")
if os.path.exists(pipecat_src):
    sys.path.insert(0, pipecat_src)
    logger.info(f"Added {pipecat_src} to sys.path")

try:
    from pipecat.transports.websocket.fastapi import FastAPIWebsocketTransport, FastAPIWebsocketParams
except ImportError as e:
    logger.error(f"Failed to import FastAPIWebsocketTransport: {e}")
    # Fallback to the deprecated path just in case
    try:
        from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport, FastAPIWebsocketParams
    except ImportError:
        logger.error("Could not import FastAPIWebsocketTransport from any known location.")
        raise

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.runner.types import RunnerArguments

# Import the bot logic
from nivest_bot import run_bot

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False, 
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=None 
        )
    )

    runner_args = RunnerArguments(handle_sigint=False)

    try:
        await run_bot(transport, runner_args)
    except Exception as e:
        logger.error(f"Bot execution error: {e}")
    finally:
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
