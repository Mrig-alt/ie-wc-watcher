-- Performance indexes for frequently-queried student columns
-- flagged + visibility are used as WHERE conditions on almost every page
CREATE INDEX IF NOT EXISTS students_flagged_idx ON students (flagged);
CREATE INDEX IF NOT EXISTS students_team_id_idx ON students (team_id);
CREATE INDEX IF NOT EXISTS students_token_balance_idx ON students (token_balance DESC);
-- Composite index for the common pattern: WHERE flagged = false AND visibility = 'public'
CREATE INDEX IF NOT EXISTS students_flagged_visibility_idx ON students (flagged, visibility);

-- bets: settled + isOpenMarket used in market and settlement queries
CREATE INDEX IF NOT EXISTS bets_settled_idx ON bets (settled);
CREATE INDEX IF NOT EXISTS bets_open_market_idx ON bets (is_open_market);
CREATE INDEX IF NOT EXISTS bets_settled_status_idx ON bets (settled, status);
