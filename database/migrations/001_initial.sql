-- Sovrana Platform Initial Schema
-- Migration 001

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username    VARCHAR(64) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role        VARCHAR(32) NOT NULL DEFAULT 'admin',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. wallet_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(128) NOT NULL UNIQUE,
    evm_address     VARCHAR(42) NOT NULL,
    secret_ref      TEXT NOT NULL,
    secret_backend  VARCHAR(32) NOT NULL DEFAULT 'env',
    chain_id        INTEGER NOT NULL DEFAULT 137,
    is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. agents
-- ============================================================
CREATE TYPE agent_mode AS ENUM ('read_only', 'trading_enabled');
CREATE TYPE agent_status AS ENUM ('idle', 'running', 'errored', 'stopped', 'killed');

CREATE TABLE IF NOT EXISTS agents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(128) NOT NULL UNIQUE,
    description     TEXT,
    mode            agent_mode NOT NULL DEFAULT 'read_only',
    status          agent_status NOT NULL DEFAULT 'idle',
    is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulate     BOOLEAN NOT NULL DEFAULT TRUE,
    manual_approve  BOOLEAN NOT NULL DEFAULT FALSE,
    kill_switch     BOOLEAN NOT NULL DEFAULT FALSE,
    wallet_profile_id UUID REFERENCES wallet_profiles(id) ON DELETE SET NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. agent_risk_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_risk_limits (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id                UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    max_order_size_usdc     NUMERIC(18,6) NOT NULL DEFAULT 100,
    max_exposure_usdc       NUMERIC(18,6) NOT NULL DEFAULT 500,
    daily_loss_cap_usdc     NUMERIC(18,6) NOT NULL DEFAULT 200,
    slippage_cap_pct        NUMERIC(6,4) NOT NULL DEFAULT 3.0,
    cooldown_seconds        INTEGER NOT NULL DEFAULT 60,
    max_open_orders         INTEGER NOT NULL DEFAULT 10,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. agent_market_permissions
-- ============================================================
CREATE TYPE market_permission_type AS ENUM ('allowlist', 'denylist');

CREATE TABLE IF NOT EXISTS agent_market_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    condition_id    VARCHAR(128) NOT NULL,
    permission_type market_permission_type NOT NULL DEFAULT 'allowlist',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, condition_id)
);

-- ============================================================
-- 6. strategies
-- ============================================================
CREATE TABLE IF NOT EXISTS strategies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(128) NOT NULL UNIQUE,
    template_type   VARCHAR(64) NOT NULL,
    description     TEXT,
    config_schema   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_strategies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    config          JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, strategy_id)
);

-- ============================================================
-- 7. strategy_runs
-- ============================================================
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS strategy_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    status          run_status NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    run_metadata    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. signals
-- ============================================================
CREATE TYPE signal_side AS ENUM ('buy', 'sell');
CREATE TYPE signal_status AS ENUM ('pending', 'approved', 'rejected', 'executed', 'expired');

CREATE TABLE IF NOT EXISTS signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    strategy_run_id UUID REFERENCES strategy_runs(id) ON DELETE SET NULL,
    condition_id    VARCHAR(128) NOT NULL,
    token_id        VARCHAR(128),
    side            signal_side NOT NULL,
    price           NUMERIC(18,6) NOT NULL,
    size_usdc       NUMERIC(18,6) NOT NULL,
    confidence      NUMERIC(5,4) NOT NULL,
    time_horizon    INTEGER,
    status          signal_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    raw_data        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. orders
-- ============================================================
CREATE TYPE order_status AS ENUM ('pending', 'placed', 'partial', 'filled', 'cancelled', 'rejected', 'blocked');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'gtc', 'fok');

CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    signal_id       UUID REFERENCES signals(id) ON DELETE SET NULL,
    polymarket_order_id VARCHAR(128),
    condition_id    VARCHAR(128) NOT NULL,
    token_id        VARCHAR(128) NOT NULL,
    side            signal_side NOT NULL,
    order_type      order_type NOT NULL DEFAULT 'limit',
    price           NUMERIC(18,6),
    size_usdc       NUMERIC(18,6) NOT NULL,
    status          order_status NOT NULL DEFAULT 'pending',
    block_reason    TEXT,
    raw_response    JSONB DEFAULT '{}',
    placed_at       TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. fills
-- ============================================================
CREATE TABLE IF NOT EXISTS fills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    polymarket_fill_id VARCHAR(128) NOT NULL,
    condition_id    VARCHAR(128) NOT NULL,
    token_id        VARCHAR(128) NOT NULL,
    side            signal_side NOT NULL,
    fill_price      NUMERIC(18,6) NOT NULL,
    fill_size_usdc  NUMERIC(18,6) NOT NULL,
    fee_usdc        NUMERIC(18,6) NOT NULL DEFAULT 0,
    filled_at       TIMESTAMPTZ NOT NULL,
    raw_data        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. positions
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    condition_id    VARCHAR(128) NOT NULL,
    token_id        VARCHAR(128) NOT NULL,
    side            signal_side NOT NULL,
    size_usdc       NUMERIC(18,6) NOT NULL DEFAULT 0,
    avg_entry_price NUMERIC(18,6) NOT NULL DEFAULT 0,
    current_price   NUMERIC(18,6),
    unrealized_pnl  NUMERIC(18,6),
    realized_pnl    NUMERIC(18,6) NOT NULL DEFAULT 0,
    is_open         BOOLEAN NOT NULL DEFAULT TRUE,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, condition_id, token_id, is_open)
);

-- ============================================================
-- 12. pnl_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS pnl_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    realized_pnl    NUMERIC(18,6) NOT NULL DEFAULT 0,
    unrealized_pnl  NUMERIC(18,6) NOT NULL DEFAULT 0,
    total_pnl       NUMERIC(18,6) NOT NULL DEFAULT 0,
    total_volume    NUMERIC(18,6) NOT NULL DEFAULT 0,
    trade_count     INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, snapshot_date)
);

-- ============================================================
-- 13. audit_logs
-- ============================================================
CREATE TYPE audit_event_type AS ENUM (
    'signal_generated',
    'signal_approved',
    'signal_rejected',
    'order_attempt',
    'order_placed',
    'order_filled',
    'order_cancelled',
    'order_blocked',
    'risk_breach',
    'kill_switch_triggered',
    'agent_started',
    'agent_stopped',
    'agent_created',
    'agent_updated',
    'config_changed',
    'manual_order',
    'error'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type      audit_event_type NOT NULL,
    agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(64),
    entity_id       UUID,
    message         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    severity        VARCHAR(16) NOT NULL DEFAULT 'info',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_agent_id ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- 14. system_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    key             VARCHAR(128) PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description)
VALUES
    ('global_kill_switch', 'false', 'When true all trading halted platform wide'),
    ('default_max_order_size_usdc', '100', 'Default max order size in USDC'),
    ('default_max_exposure_usdc', '500', 'Default max market exposure in USDC'),
    ('default_daily_loss_cap_usdc', '200', 'Default daily loss cap in USDC'),
    ('default_slippage_cap_pct', '3.0', 'Default slippage cap percentage'),
    ('default_cooldown_seconds', '60', 'Default cooldown between orders in seconds'),
    ('default_max_open_orders', '10', 'Default max concurrent open orders')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- market_snapshots (ingestion cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS market_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_id    VARCHAR(128) NOT NULL,
    question        TEXT,
    category        VARCHAR(64),
    end_date        TIMESTAMPTZ,
    yes_price       NUMERIC(8,6),
    no_price        NUMERIC(8,6),
    volume_24h      NUMERIC(18,6),
    open_interest   NUMERIC(18,6),
    active          BOOLEAN DEFAULT TRUE,
    raw_data        JSONB DEFAULT '{}',
    snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_snapshots_condition_id ON market_snapshots(condition_id);
CREATE INDEX idx_market_snapshots_snapshotted_at ON market_snapshots(snapshotted_at DESC);

-- ============================================================
-- orderbook_snapshots (ingestion cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS orderbook_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id        VARCHAR(128) NOT NULL,
    condition_id    VARCHAR(128) NOT NULL,
    bids            JSONB NOT NULL DEFAULT '[]',
    asks            JSONB NOT NULL DEFAULT '[]',
    spread          NUMERIC(8,6),
    mid_price       NUMERIC(8,6),
    snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orderbook_condition_id ON orderbook_snapshots(condition_id);
CREATE INDEX idx_orderbook_snapshotted_at ON orderbook_snapshots(snapshotted_at DESC);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_wallet_profiles_updated_at BEFORE UPDATE ON wallet_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_strategies_updated_at BEFORE UPDATE ON strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_signals_updated_at BEFORE UPDATE ON signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default admin user (password: changeme, update immediately)
-- bcrypt hash of "changeme"
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@sovrana.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN7/LBXEm9WlXa8NvKqGq', 'admin')
ON CONFLICT (username) DO NOTHING;
