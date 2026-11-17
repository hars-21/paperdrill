-- The leaderboard is now projected in memory from live account snapshots, so
-- these snapshot tables and their indexes are no longer read or written.
DROP TABLE "LeaderboardEntry";
DROP TABLE "LeaderboardState";
