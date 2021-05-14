#!/bin/bash
# Local 
echo "Running local dev environment; Ctrl+C to exit"

# Set up a local server with the right mime-types
cd web
deno run --allow-net --allow-read https://deno.land/std@0.96.0/http/file_server.ts -p 8000 & pid1=$!

# Run our app server
cd ../server
deno run -A ./haikupotamus.js & pid2=$!

# When the user presses Ctrl+C, kill the bg processes we just spawned
trap "kill -9 $pid1 $pid2" INT
wait