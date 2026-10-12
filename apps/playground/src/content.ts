import type { ComponentType } from "react";

type PageModule = {
  default: ComponentType;
  meta?: { title?: string; description?: string };
};

export type ContentPage = {
  route: string;
  sourcePath: string;
  title: string;
  description?: string;
  Component: ComponentType;
};

export type ContentSection = {
  id: string;
  label: string;
  description: string;
  pages: ContentPage[];
};

const contentSources = [
  { directory: "docs", label: "Docs", description: "Documentation for reusable workflows." },
  { directory: "examples", label: "Examples", description: "Copyable workflow examples." },
] as const;

function humanize(value: string): string {
  return value
    .replace(/^\\d+-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\b\\w/g, (character) => character.toUpperCase());
}

// Discover page files by location. Rendering and navigation do not depend on
// whether a page belongs to docs, examples, or any other content source.
const modules = import.meta.glob(["../../../**/page.mdx", "!../../../node_modules/**", "!../../../apps/**"], {
  eager: true,
}) as Record<string, PageModule>;

function discoverPages(): ContentPage[] {
  return Object.entries(modules).map(([path, module]) => {
    const sourcePath = path.replace(/^\\.\\.\\/\\.\\.\\/\\.\\.\\//, "");
    const directory = sourcePath.replace(/\\/page\\.mdx$/, "");
    const route = `/${directory}`;
    const segments = directory.split("/");
    return {
      route,
      sourcePath,
      title: module.meta?.title ?? humanize(segments.at(-1) ?? "Home"),
      description: module.meta?.description,
      Component: module.default,
    };
  }).sort((a, b) => a.route.localeCompare(b.route));
}

const pages = discoverPages();

export const CONTENT_SECTIONS: ContentSection[] = contentSources.map((source) => ({
  id: source.directory,
  label: source.label,
  description: source.description,
  pages: pages.filter((page) => page.route === `/${source.directory}` ||
    page.route.startsWith(`/${source.directory}/`)),
}));
