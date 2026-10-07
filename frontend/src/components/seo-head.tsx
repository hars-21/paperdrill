import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE, OG_IMAGE, resolvePageSeo, canonicalUrl, jsonLdWebPage } from "@/lib/seo";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
	let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
	if (!el) {
		el = document.createElement("meta");
		el.setAttribute(attr, key);
		document.head.appendChild(el);
	}
	el.content = content;
}

function upsertLink(rel: string, href: string) {
	let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
	if (!el) {
		el = document.createElement("link");
		el.rel = rel;
		document.head.appendChild(el);
	}
	el.href = href;
}

function upsertJsonLd(id: string, data: object) {
	let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo-id="${id}"]`);
	if (!el) {
		el = document.createElement("script");
		el.type = "application/ld+json";
		el.dataset.seoId = id;
		document.head.appendChild(el);
	}
	el.textContent = JSON.stringify(data);
}

interface SeoHeadProps {
	title?: string;
	description?: string;
	path?: string;
	noIndex?: boolean;
}

export function SeoHead(props?: SeoHeadProps) {
	const { pathname } = useLocation();
	const resolved = resolvePageSeo(pathname);
	const seo = { ...resolved, ...props };

	const title = seo.title;
	const description = seo.description ?? SITE.description;
	const canonical = canonicalUrl(seo.path ?? pathname);
	const robots = seo.noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

	useEffect(() => {
		document.title = title;

		upsertMeta("name", "description", description);
		upsertMeta("name", "robots", robots);
		upsertMeta("name", "author", SITE.name);
		upsertMeta(
			"name",
			"theme-color",
			document.documentElement.classList.contains("dark") ? "#0a0a0c" : "#ffffff",
		);

		upsertLink("canonical", canonical);

		upsertMeta("property", "og:type", "website");
		upsertMeta("property", "og:site_name", SITE.name);
		upsertMeta("property", "og:title", title);
		upsertMeta("property", "og:description", description);
		upsertMeta("property", "og:url", canonical);
		upsertMeta("property", "og:image", OG_IMAGE);
		upsertMeta("property", "og:image:secure_url", OG_IMAGE);
		upsertMeta("property", "og:image:type", "image/png");
		upsertMeta("property", "og:image:width", "1737");
		upsertMeta("property", "og:image:height", "906");
		upsertMeta("property", "og:image:alt", "PaperDrill logo with a candlestick trading chart");
		upsertMeta("property", "og:locale", SITE.locale);

		upsertMeta("name", "twitter:card", "summary_large_image");
		upsertMeta("name", "twitter:title", title);
		upsertMeta("name", "twitter:description", description);
		upsertMeta("name", "twitter:image", OG_IMAGE);
		upsertMeta("name", "twitter:image:alt", "PaperDrill logo with a candlestick trading chart");

		upsertJsonLd("webpage", jsonLdWebPage(title, description, canonical));
	}, [title, description, canonical, robots, pathname]);

	return null;
}
