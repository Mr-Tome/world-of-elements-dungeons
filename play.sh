#!/usr/bin/env bash
# Start World of Elements: Dungeons. Serves the game locally and opens it in Chromium.
cd "$(dirname "$0")"
PORT=8765
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
URL="http://127.0.0.1:$PORT/index.html"
echo "Game running at $URL  (press Ctrl+C here to stop the game server)"
if command -v chromium >/dev/null; then chromium --app="$URL" --start-maximized >/dev/null 2>&1 &
elif command -v chromium-browser >/dev/null; then chromium-browser --app="$URL" --start-maximized >/dev/null 2>&1 &
else xdg-open "$URL" >/dev/null 2>&1 &
fi
wait $SERVER
