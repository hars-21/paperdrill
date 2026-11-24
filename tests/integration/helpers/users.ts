import { TestDatabase } from "../setup/database";
import { ApiClient } from "./api";
import type { EngineClient } from "./engine";

const password = "integration-password";

export interface TestUser {
	id: string;
	email: string;
	client: ApiClient;
}

export async function createTestUser(label: string): Promise<TestUser> {
	const client = new ApiClient();
	const email = `${label}-${crypto.randomUUID()}@test.paperdrill`;
	const response = await client.signup(email, label, password);
	const user = response.data.user;

	if (response.status !== 200 || !user) {
		throw new Error(`Failed to create test user ${email}: ${JSON.stringify(response.data)}`);
	}

	const database = new TestDatabase();
	try {
		await database.markEmailVerified(user.id);
	} finally {
		await database.close();
	}

	const usernameBase = label.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 11) || "trader";
	const username = `${usernameBase}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
	const onboarding = await client.completeOnboarding({ name: label, username });
	if (onboarding.status !== 200) {
		throw new Error(`Failed to onboard test user ${email}: ${JSON.stringify(onboarding.data)}`);
	}

	const initial = await client.claimInitialCredit();
	if (initial.status !== 200 || !initial.data.claimed) {
		throw new Error(`Failed to claim initial credit for ${email}: ${JSON.stringify(initial.data)}`);
	}

	return { id: user.id, email, client };
}

export async function seedBalance(
	engine: EngineClient,
	userId: string,
	asset: string,
	amount: string,
) {
	await engine.command("create_deposit", { userId, asset, amount });
}
