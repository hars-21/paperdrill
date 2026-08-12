import { createContext, useContext, useEffect, useState } from "react";
import { brandIcon } from "@/assets";

type Theme = "dark" | "light";

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		const saved = localStorage.getItem("theme");
		if (saved === "dark" || saved === "light") return saved;
		return "dark";
	});

	useEffect(() => {
		const root = window.document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", theme);

		let favicon = document.querySelector<HTMLLinkElement>('link[data-theme-favicon="true"]');
		if (!favicon) {
			favicon = document.createElement("link");
			favicon.rel = "icon";
			favicon.type = "image/svg+xml";
			favicon.dataset.themeFavicon = "true";
			document.head.appendChild(favicon);
		}
		favicon.href = brandIcon(theme);
	}, [theme]);

	const toggleTheme = () => {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
	};

	const setTheme = (t: Theme) => {
		setThemeState(t);
	};

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
