# Sovrana AI Trade — Polymarket Agent Platform

A production-grade autonomous trading operations dashboard for Polymarket prediction markets, built with Next.js 14, TypeScript, and Tailwind CSS. The platform provides a dark-themed command center for managing AI trading agents, monitoring live market data, tracking positions, and executing orders through the Polymarket CLOB API with full L1/L2 authentication.

---

## Architecture Overview

| Layer | Technology | Purpose |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | Server-side rendering, static generation, API routes |
| UI Framework | Tailwind CSS | Dark-themed responsive design system |
| Language | TypeScript | End-to-end type safety |
| Charts | Recharts | PnL visualization and analytics |
| Icons | Lucide React | Consistent iconography |
| API Client | Custom HMAC-SHA256 | L2 authenticated Polymarket API integration |
| Order Signing | ethers.js v5 | EIP-712 typed data signing for L1 authentication |
| State | React Hooks | Client-side data fetching with auto-refresh |

---

## Dashboard Pages

The platform includes 12 fully functional pages organized into two sections:

### Operations Dashboard (Mock + Simulated Data)

| Page | Route | Description |
|------|-------|------------|
| Dashboard | `/` | Executive overview with KPIs, agent status, recent activity |
| Agents | `/agents` | List and manage AI trading agents with strategy details |
| Agent Detail | `/agents/[id]` | Individual agent configuration, performance, and trade history |
| Signals | `/signals` | AI-generated trading signals with confidence scores |
| Orders | `/orders` | Order management with status tracking and filtering |
| Fills | `/fills` | Executed trade fills with price and fee details |
| Positions | `/positions` | Portfolio positions with PnL tracking |
| PnL | `/pnl` | Profit and loss analytics with interactive charts |
| Markets | `/markets` | Market overview with volume and liquidity data |
| Audit Log | `/audit-log` | System event log for compliance and debugging |

### Live API Data (Real-Time Polymarket)

| Page | Route | Description |
|------|-------|------------|
| Live Markets | `/live-markets` | 100 active markets with real-time prices from Gamma API |
| Live Positions | `/live-positions` | Wallet positions from Data API |
| Live Trades | `/live-trades` | Trade history from Data API |

---

## API Routes

All Polymarket API communication is proxied through secure server-side API routes:

| Endpoint | Method | Auth | Description |
|----------|--------|------|------------|
| `/api/polymarket/markets` | GET | Public | Fetch active markets from Gamma API |
| `/api/polymarket/events` | GET | Public | Fetch events from Gamma API |
| `/api/polymarket/positions` | GET | Public | Fetch user positions from Data API |
| `/api/polymarket/trades` | GET | Public | Fetch user trade history from Data API |
| `/api/polymarket/orders` | GET/DELETE | L2 HMAC | Fetch or cancel orders via CLOB API |
| `/api/polymarket/orderbook` | GET | Public | Fetch orderbook, midpoint, or last trade price |
| `/api/polymarket/prices-history` | GET | Public | Fetch historical price data |
| `/api/polymarket/place-order` | POST | L1+L2 | Sign and submit orders to CLOB API |
| `/api/polymarket/health` | GET | Public | Check API connectivity and config status |

---

## Authentication Model

The platform implements Polymarket's two-level authentication. L1 Authentication uses the wallet private key to sign EIP-712 typed data structures via ethers.js v5, required for creating API credentials and signing order payloads for the CTF Exchange smart contract. L2 Authentication uses HMAC-SHA256 signatures constructed from the API secret, timestamp, HTTP method, request path, and body, sent as POLY_SIGNATURE headers alongside POLY_ADDRESS, POLY_API_KEY, POLY_PASSPHRASE, and POLY_TIMESTAMP for all authenticated CLOB API endpoints.

---

## Setup & Installation

```bash
git clone https://github.com/mokhalilsa/Sovrana.git
cd Sovrana/sovrana-platform
pnpm install
cp .env.example .env.local
# Edit .env.local with your Polymarket API credentials
pnpm dev
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|------------|
| `POLY_ADDRESS` | Yes | Polygon wallet address |
| `POLY_API_KEY` | Yes | CLOB API key |
| `POLY_SECRET` | Yes | Base64-encoded HMAC secret |
| `POLY_PASSPHRASE` | Yes | API passphrase |
| `PRIVATE_KEY` | Yes | Wallet private key for order signing |
| `GAMMA_API_URL` | No | Gamma API base URL |
| `DATA_API_URL` | No | Data API base URL |
| `CLOB_API_URL` | No | CLOB API base URL |
| `CHAIN_ID` | No | Polygon chain ID (default: 137) |

---

## Security

All API credentials and private keys are stored exclusively in `.env.local`, which is excluded from version control via `.gitignore`. The `.env.example` file provides a template without sensitive values. All authenticated API calls are made server-side through Next.js API routes, ensuring credentials never reach the client browser.

---

*Proprietary — Sovrana AI Trade / Meridian Trade*