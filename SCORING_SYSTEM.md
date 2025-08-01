Bachelor-Party “Mini-Olympics” Scoring System
1 · Context

A one-day party for 12 players mixing team sports (soccer, volleyball, Counter-Strike, League of Legends) and 1-v-1 stations (FIFA, chess, target-shooting, etc.).
Because everyone plays a different number of matches, we rank by efficiency (tickets per match) rather than raw totals.
2 · Core Constants
Symbol	Value	Meaning
K	40	Tickets minted per player in every scored match
WIN	0.70	Fraction of the pot awarded to winners
LOSE	0.30	Fraction of the pot awarded to losers
MVP_BONUS	0.05	Extra pot share given to one MVP in every team match (≥ 4 players)
3 · Match-to-Tickets Algorithm

For a match with P total players and W winners (P – W losers):

pot          = K × P
winner_tix   = pot × WIN  / W
loser_tix    = pot × LOSE / (P – W)
mvp_tix      = pot × MVP_BONUS        // one per team match

Longer matches (e.g. a 30-min CS map) may multiply pot by a time factor before splitting.
4 · Per-Player Bonuses
Bonus	Trigger	Multiplier / Additive	Notes
Joker	Declared before any match, once per player	× 2 on that match’s tickets (after MVP)	Timing gambit
Momentum	Player is outside Top 3 at leaderboard refresh	× 1.25 on their next win only	Flag clears after use
MVP	Team vote after each team match	+ mvp_tix	Cannot be doubled (apply after multipliers)

Bonus order: Joker → Momentum → MVP.
All bonuses change the numerator only (tickets earned), never the denominator.
5 · Leaderboard Metric

matches_played = total rows recorded for that player
denominator    = K × matches_played
efficiency %   = (tickets_total / denominator) × 100

100 % ≈ break-even (win rate = loss rate with no bonuses).

Sort descending by efficiency %.
Tie-breakers: 1️⃣ head-to-head ticket differential → 2️⃣ total wins → 3️⃣ sudden-death Rock-Paper-Scissors.
6 · Recommended Data Model

Player {
  id: string,
  name: string,
  matches_played: int,
  tickets_total: int,
  efficiency: float,        // derived
  joker_used: boolean,
  momentum_flag: boolean    // true when eligible, auto-clears on use
}

MatchResult {
  match_id: string,
  timestamp: ISO-8601,
  players: [PlayerId],
  winners: [PlayerId],
  mvp: PlayerId | null,
  pot: int,
  per_player_tickets: { PlayerId: int },
  joker_played: [PlayerId],       // global one-time list
  momentum_triggered: [PlayerId]
}

The webapp only appends a MatchResult; all leaderboard fields are recomputed on demand.
7 · Event Flow (pseudocode)

on match_end:
    pot = K * players
    if long_match: pot *= time_factor
    assign winner_tix / loser_tix
    if MVP: add mvp_tix to that player
    if Joker flag: multiply that player’s subtotal by 2
    if Momentum flag and result == win: multiply subtotal by 1.25, clear flag
    update Player.tickets_total and Player.matches_played
    recompute efficiency %
    refresh leaderboard
    set momentum_flag = true for ranks ≥ 4

8 · Worked Example (5 v 5 LoL, 1 MVP, 1 Joker)

pot = 40 × 10 = 400
winner_base = 400 × 0.70 / 5 = 56
loser_base  = 400 × 0.30 / 5 = 24
MVP_bonus   = 400 × 0.05      = 20

Alice (winner, Joker): (56 + 20) × 2 = 152 tickets
Bob   (winner)        : 56 tickets
Eve   (loser)         : 24 tickets

Alice efficiency = 152 / (40 × 1) = 3.80  → 380 %
Bob   efficiency =  56 / 40        = 1.40 → 140 %
Eve   efficiency =  24 / 40        = 0.60 →  60 %

Eve remains outside Top 3, so her momentum_flag stays true for the next round.

Finally Scoring a Ranked Free-for-All (e.g., the chess tournament)

Treat the entire chess tourney as one multi-player match with a normal ticket pot, then split that pot by final rank.

P         = number of players (here 12)
pot       = K × P                          // 40 × 12 = 480
rank_i    = 1 for champion … P for last
weight_i  = P – rank_i + 1                // 12, 11, 10 … 1
S         = P × (P + 1) / 2               // sum of 1..P  → 78
tickets_i = pot × weight_i / S