import { Router } from "express";
import {
	getPortfolio,
	getPortfolioAnalytics,
	getPortfolioHistory,
	getPortfolioPosition,
	getPortfolioPositionEvents,
} from "../controllers/portfolio";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const portfolioRouter = Router();

portfolioRouter.get(
	"/",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolio),
);
portfolioRouter.get(
	"/history",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolioHistory),
);
portfolioRouter.get(
	"/analytics",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolioAnalytics),
);
portfolioRouter.get(
	"/positions/:asset",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolioPosition),
);
portfolioRouter.get(
	"/positions/:asset/events",
	requireAccess({ scopes: ["ACCOUNT_READ"], allowUnverified: true }),
	asyncHandler(getPortfolioPositionEvents),
);
