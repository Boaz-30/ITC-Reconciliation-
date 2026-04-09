#!/bin/bash
echo "Installing dependencies..."
cd server && npm install
cd ../client && npm install
cd ..

echo ""
echo "Starting development servers..."
echo "  API Server  → http://localhost:3001"
echo "  React App   → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."
echo ""

# Start both in background, kill both on exit
trap "kill 0" EXIT

(cd server && npm run dev) &
(cd client && npm run dev) &

wait
