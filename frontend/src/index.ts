import { serve } from "bun";
import { existsSync } from "fs";
import path from "path";
import index from "./index.html";

const publicDir = path.join(import.meta.dir, "..", "public");

function publicFile(relativePath: string): Response | undefined {
	const filePath = path.join(publicDir, relativePath);
	if (!existsSync(filePath)) return undefined;
	return new Response(Bun.file(filePath));
}

const staticRoutes: Record<string, () => Response | undefined> = {
	"/robots.txt": () => publicFile("robots.txt"),
	"/llms.txt": () => publicFile("llms.txt"),
	"/sitemap.xml": () => publicFile("sitemap.xml"),
	"/site.webmanifest": () => publicFile("site.webmanifest"),
	"/og-image.png": () => publicFile("og-image.png"),
	"/favicon-dark.svg": () => publicFile("favicon-dark.svg"),
	"/favicon-light.svg": () => publicFile("favicon-light.svg"),
	"/apple-touch-icon.png": () => publicFile("apple-touch-icon.png"),
	"/.well-known/security.txt": () => publicFile(".well-known/security.txt"),
};

const server = serve({
	routes: {
		...Object.fromEntries(
			Object.entries(staticRoutes).map(([route, handler]) => [
				route,
				() => {
					const response = handler();
					return response ?? new Response("Not Found", { status: 404 });
				},
			]),
		),
		"/*": index,
	},

	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
