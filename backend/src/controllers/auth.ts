import type { Request, Response } from "express";
import { issueAccountTicket } from "../utils/websocket";
import { getUserId } from "../utils/principal";

export async function createWebSocketTicket(req: Request, res: Response) {
	const userId = getUserId(req);
	const ticket = await issueAccountTicket(userId);
	res.status(201).json(ticket);
}
