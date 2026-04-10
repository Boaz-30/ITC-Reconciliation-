# ITC Reconciliation Dashboard

A full-stack reconciliation dashboard for the CS team to view, filter, update, and export transactions — with native n8n automation support.

---

## Tech Stack

- **Frontend**: React 18 + Vite + Chart.js
- **Backend**: Node.js + Express
- **Automation**: n8n webhook endpoints (built-in)

---

## Quick Start

### 1. Install dependencies

```bash
cd reconciliation-dashboard

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Run in development mode (two terminals)

**Terminal 1 — API server (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — React client (port 5173):**
```bash
cd client
npm run dev
```

Open: http://localhost:5173

---

### 3. Run in production mode (single server)

```bash
# Build the React app
cd client && npm run build

# Serve everything from Express
cd ../server && npm start
```

Open: http://localhost:3001

---

## n8n Integration

The server exposes dedicated webhook endpoints for n8n automation.

### API Key
All webhook routes require the header:
```
x-api-key: n8n-secret-2024
```
> Change this in `server/src/index.js` → `webhookSecret` variable.

---

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/transactions/pending`       | Pull all pending transactions |
| POST | `/webhook/n8n/ova-upload`         | Push parsed OVA records (JSON) |
| POST | `/webhook/n8n/auto-reconcile`     | Auto-update all pending → OVA status |
| POST | `/webhook/n8n/update-status`      | Update individual transaction statuses |
| GET  | `/webhook/n8n/health`             | Health check + current stats |

---

### Recommended n8n Workflow

```
Schedule Trigger
    ↓
Read Binary File  (your OVA CSV)
    ↓
Spreadsheet File  (parse CSV → JSON rows)
    ↓
HTTP Request  POST /webhook/n8n/ova-upload
  Headers: x-api-key: n8n-secret-2024
  Body: { "records": {{ $json.all_rows }} }
    ↓
HTTP Request  POST /webhook/n8n/auto-reconcile
  Headers: x-api-key: n8n-secret-2024
  Body: { "updatedBy": "n8n Automation" }
    ↓
Done — dashboard updates in real time
```

---

### Request/Response Examples

**Pull pending transactions:**
```bash
curl http://localhost:3001/api/transactions/pending \
  -H "x-api-key: n8n-secret-2024"
```

**Push OVA data:**
```bash
curl -X POST http://localhost:3001/webhook/n8n/ova-upload \
  -H "Content-Type: application/json" \
  -H "x-api-key: n8n-secret-2024" \
  -d '{
    "records": [
      {
        "uniwalletId": "UW-123456",
        "date": "2024-01-15",
        "status": "successful",
        "amount": 1500,
        "telco": "MTN",
        "name": "Kwame Asante",
        "merchantId": "MERCH-001",
        "referenceId": "REF-001"
      }
    ]
  }'
```

**Trigger auto-reconcile:**
```bash
curl -X POST http://localhost:3001/webhook/n8n/auto-reconcile \
  -H "Content-Type: application/json" \
  -H "x-api-key: n8n-secret-2024" \
  -d '{ "updatedBy": "n8n Automation" }'
```

**Update individual statuses:**
```bash
curl -X POST http://localhost:3001/webhook/n8n/update-status \
  -H "Content-Type: application/json" \
  -H "x-api-key: n8n-secret-2024" \
  -d '{
    "updates": [
      { "id": "TXN-0001", "status": "successful" },
      { "id": "TXN-0002", "status": "failed" }
    ]
  }'
```

---

## Dashboard Features

### Transactions View
- View All / Pending / Successful / Failed transactions
- Filter by telco (MTN, Telecel, AT) and search by ID/wallet/name
- Each row: Txn ID, UniWallet ID, Full Name, Date, Time, Telco, Amount, Status, Network ID, OVA Status
- Network ID auto-generated on successful status
- Bulk select + bulk mark successful/failed
- Individual status update modal with OVA comparison
- Export pending list as CSV

### OVA Upload
- Drag-and-drop or browse CSV upload
- Auto-matches OVA records by UniWallet ID + Date
- Download sample CSV template

### Reconciliation View
- Side-by-side App Status vs OVA Status comparison
- Mismatch detection and highlighting
- One-click "Auto-resolve all mismatches"
- Per-row "Resolve" modal

### n8n Integration Panel
- All webhook URLs displayed and copyable
- Live test buttons for each endpoint
- Setup instructions per endpoint
- API key display

---

## File Structure

```
reconciliation-dashboard/
├── server/
│   ├── package.json
│   └── src/
│       └── index.js          ← Express API + webhook routes
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            ← Root layout + routing
│       ├── index.css          ← Global styles
│       ├── components/
│       │   ├── UI.jsx         ← Shared components
│       │   ├── Sidebar.jsx
│       │   └── Charts.jsx
│       ├── pages/
│       │   ├── TransactionsPage.jsx
│       │   ├── UploadPage.jsx
│       │   ├── ReconcilePage.jsx
│       │   └── N8nPage.jsx
│       ├── hooks/
│       │   └── useToast.js
│       └── utils/
│           └── api.js         ← All API calls
└── README.md
```

---

## Connecting to a Real Database

The server currently uses an in-memory store (resets on restart). To persist data:

1. Install a database driver: `npm install pg` (PostgreSQL) or `npm install mongoose` (MongoDB)
2. Replace the `transactions` array in `server/src/index.js` with DB queries
3. Add a `.env` file with your connection string

---

## Security Notes

- Change `webhookSecret` in `server/src/index.js` before deploying
- Add HTTPS (use nginx or a reverse proxy) for production
- Consider JWT auth for the dashboard in production
