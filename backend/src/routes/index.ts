import { Router } from "express";
import { authRouter } from "./auth";
import { orderRouter } from "./order";
import { userRouter } from "./user";
import { marketRouter } from "./market";
import { keyRouter } from "./key";
import { leaderboardRouter } from "./leaderboard";
import { balanceRouter } from "./balance";
import { portfolioRouter } from "./portfolio";

export const appRouter = Router();

appRouter.use(userRouter);
appRouter.use("/balances", balanceRouter);
appRouter.use("/portfolio", portfolioRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/orders", orderRouter);
appRouter.use("/markets", marketRouter);
appRouter.use("/keys", keyRouter);
appRouter.use("/leaderboard", leaderboardRouter);
