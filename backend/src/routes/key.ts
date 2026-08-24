import { Router } from "express";
import { requireAccess } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { createKey, listKeys, revokeKey } from "../controllers/key";

export const keyRouter = Router();

keyRouter.get("/", requireAccess({ types: ["session"] }), asyncHandler(listKeys));
keyRouter.post("/", requireAccess({ types: ["session"] }), asyncHandler(createKey));
keyRouter.delete("/:id", requireAccess({ types: ["session"] }), asyncHandler(revokeKey));
