# Expansion Thoughts: The Global Football Hub

*These are long-term roadmap ideas. Current priority is laser-focused on the World Cup to drive initial traffic and user adoption.*

## The Vision
Expand the platform from a "World Cup 2026 Watcher" into a comprehensive hub for **all international national team football**. 
This includes:
- Copa America
- Euros
- Asian Cup
- African Cup of Nations (AFCON)
- CONCACAF Gold Cup
- Global Friendlies & Qualifiers

## Key Considerations

### 1. Match Tracking vs. Venue Tracking
Currently, the app relies on Madrid bars explicitly stating they will show a match. For global tournaments and random friendlies (e.g., an Asian Cup qualifier), local Madrid bars likely won't broadcast them.
- **Solution:** List these matches purely for **live scores** and **predictions/bets**, even if no venues are attached to them. Users can still engage with the app without needing a physical watch party.

### 2. Leaderboard Segregation
The current leaderboard and prediction token economy is tightly coupled to the World Cup 2026.
- **Solution:** We must strictly separate leaderboards. Predictions made on Copa America or AFCON should not pollute the World Cup leaderboard. We will need "Tournament-Specific Leaderboards" or a global "All-Time Reputation" score separated from tournament-specific tokens.

### 3. Database Architecture Overhaul
To support this, the database will need:
- A `tournaments` table.
- A `tournament_teams` mapping table (since a team like Brazil plays in both WC and Copa America, their "Group" assignment is tournament-specific).
- Matches must be hard-linked to a specific `tournament_id`.

## Deferment Rationale
Building this multi-tournament architecture now would require massive schema migrations and UI refactoring, which would severely delay our go-to-market. 

**Immediate Goal:** Capitalize on the World Cup hype, nail the core loop (Predictions -> Watch Parties -> Leaderboard), get people using the app, and spread it across friend groups. Once we have a sticky user base, we execute this expansion to retain them year-round.
