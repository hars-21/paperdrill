export type Block =
	| { type: "heading"; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; items: string[] }
	| { type: "link"; text: string; href: string };
