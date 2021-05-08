#!/bin/bash
# Local 
echo "Running local dev environment; Ctrl+C to exit"

# Set up a local server with the right mime-types
cd web
python3 << END & pid1=$!
import http.server, socketserver
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map = {
  '.manifest': 'text/cache-manifest',
	'.html':'text/html',
  '.png':'image/png',
	'.jpg':'image/jpg',
	'.svg':'image/svg+xml',
	'.css':'text/css',
	'.js':'application/x-javascript',
	'.mjs':'application/x-javascript',
	'': 'application/octet-stream',
}
socketserver.TCPServer(("", 8000), Handler).serve_forever()
print("Serving at http://localhost:8000/web/")
END

# Run our app server
cd ../server
deno run -A ./haiku.js & pid2=$!

# When the user presses Ctrl+C, kill the bg processes we just spawned
trap "kill -9 $pid1 $pid2" INT
wait