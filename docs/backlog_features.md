# Feature Backlog & Future Roadmap

This document outlines the features developed for **IE-WC-Watcher** during the World Cup, alongside the planned post-World Cup roadmap for multi-sport expansion and pub traction analytics.

---

## ⚽ Completed Phase 1 Features (World Cup Launch)

### UI & Navigation
- [x] **1. Header Name Display:** Header shows user's name if logged in, or a "join" icon if logged out.
- [x] **2. Unified Bottom Navigation:** Bottom navigation consists of exactly 5 tabs: Home, Schedule, Watch, Classmates, and Tokens.
- [x] **3. Match Detail CTA:** Match detail page CTA ("Join the class to predict scores") is hidden for logged-in users.

### Betting & Challenges
- [x] **4. Odds-Based Token Scoring:** Correct predictions reward tokens dynamically based on real match odds. Correct exact scorelines grant a flat `+15` bonus.
- [x] **5. 1-on-1 Challenges:** Classmates can challenge each other using their global token pool.
- [x] **6. Score-Based Bets:** Two players can bet on specific match scorelines; the player with the closer prediction wins the stake.

### Groups ("Mini-Leagues")
- [x] **7. Sub-Groups:** Users can create or join private groups with their own PIN codes (similar to FPL mini-leagues).
- [x] **8. Token Isolation (CRITICAL):** Group tokens are fully isolated from the global leaderboard.
- [x] **9. Multi-Membership:** A student can be a member of the global leaderboard and multiple private subgroups simultaneously.
- [x] **10. Optional Group PIN during Sign-up:** Group PIN fields are optional during registration and can be auto-filled via links.
- [x] **11. Link Auto-Fill:** Auto-fill email and group PIN values from connection links.
- [x] **12. Master Leaderboard Promotion:** Prompt private group members to also join the master school leaderboard.

### Notifications
- [x] **13. Registrant Notifications:** Group members receive a push notification when a new classmate joins their private group.

### Data & API
- [x] **14. Real Match Schedule & Odds API:** Integrated real-time sports sync API (The Odds API) for match schedules, live updates, and betting odds.
- [x] **15. "My Team" Dashboard:** Custom hub showing match schedules, odds, and progress for the user's supported country.
- [x] **16. Group Stage Standings:** Live standings table rendering the groups.
- [x] **17. Universal Timezones:** Client-side localization ensuring matches group by day in local timezones without server hydration errors.

### Guest Mode & Refills
- [x] **18. Browse as Guest:** Allows users to access the schedule, live odds, and watch maps without registering an account.
- [x] **19. Guest Lock & PIN Verification:** Guest users are excluded from directories and leaderboards, and predict/bet features are locked until they verify a class PIN in the account tab.
- [x] **20. Token Refill (Buy-In):** Bankrupt players can refill their tokens (+100 tokens), which permanently tags them with a "Refilled 🧪" badge to preserve competition integrity.

---

## 🚀 Post-World Cup Roadmap (Planned - Do Not Build Yet)

These features will be developed after the World Cup to transition the app into a year-round, multi-sport platform for college communities.

### 📊 1. Data Analytics Layer
Integrate a telemetry pipeline to track active users, feature retention, and conversion funnels.
* **Status:** Planned
* **Design Plan:** Refer to [implementation_plan_analytics.md](file:///Users/rausan/IE-WC-Watcher/docs/implementation_plan_analytics.md) for full configuration.
* **Key metrics:** Monthly/Weekly Active Users, guest-to-member conversion rate, prediction frequency.

### 🏢 2. Pub Traction & RSVP System
Collect RSVP data to prove community demand to local pub owners, helping secure custom screens and discount deals for matchdays.
* **Status:** Planned
* **Key Features:**
  * **"Watch Intent" RSVP:** Let users tag "Going to watch here" at a pub with their party size.
  * **"Request Broadcast" CTA:** Let fans petition a pub to broadcast a specific sports event (e.g. F1 race or Premier League match).
  * **Pub Lead Email Auto-Trigger:** Automatically email pub managers when 15+ local fans request to watch a specific event at their location.

### 🏎️ 3. Multi-Sport & Multi-League Expansion
Extend the match schedule, prediction engine, and odds syncing beyond international football to cover club leagues and alternative sports.
* **Status:** Planned
* **Support Targets:**
  * **Football Club Leagues:** Premier League, La Liga, Champions League.
  * **Motorsport:** Formula 1 Grand Prix races (podium finish predictions).
  * **Basketball:** NBA matches (point-spread predictions).
