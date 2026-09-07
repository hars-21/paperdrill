import { Router } from "express";
import { authRouter } from "./auth";
import { orderRouter } from "./order";
import { userRouter } from "./user";
import { marketRouter } from "./market";
import { keyRouter } from "./key";
import { leaderboardRouter } from "./leaderboard";

export const appRouter = Router();

appRouter.use(userRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/orders", orderRouter);
appRouter.use("/markets", marketRouter);
appRouter.use("/keys", keyRouter);
appRouter.use("/leaderboard", leaderboardRouter);
