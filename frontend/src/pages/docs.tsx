import { Navigate, useParams } from "react-router-dom";
import { MarkdownContent } from "@/components/docs/markdown-content";
import { getDoc } from "@/content/docs";

export function DocsPage() {
	const { slug = "" } = useParams();
	const doc = getDoc(slug);

	if (!doc) return <Navigate to="/docs" replace />;

	return <MarkdownContent content={doc.content} />;
}
