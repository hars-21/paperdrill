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

	if (response.status !== 201 || !response.data.emailVerified) {
		throw new Error(`Failed to create test user ${email}: ${JSON.stringify(response.data)}`);
	}

	return { id: response.data.id, email, client };
}

export async function seedBalance(
	engine: EngineClient,
	userId: string,
	asset: string,
	amount: string,
) {
	await engine.command("create_deposit", { userId, asset, amount });
}
