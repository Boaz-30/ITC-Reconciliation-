@echo off
echo Installing dependencies...
cd server && npm install
cd ../client && npm install
cd ..
echo.
echo Starting server on http://localhost:3001
echo Starting client on http://localhost:5173
echo.
start "API Server" cmd /k "cd server && npm run dev"
start "React Client" cmd /k "cd client && npm run dev"
echo Both processes started. Open http://localhost:5173 in your browser.
pause
