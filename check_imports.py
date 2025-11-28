try:
    from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport
    print("Found in pipecat.transports.network.fastapi_websocket")
except ImportError as e:
    print(f"Not in pipecat.transports.network.fastapi_websocket: {e}")

try:
    from pipecat.transports.websocket.fastapi import FastAPIWebsocketTransport
    print("Found in pipecat.transports.websocket.fastapi")
except ImportError as e:
    print(f"Not in pipecat.transports.websocket.fastapi: {e}")
