import type { ComponentType } from "react";

type PageModule = {
  default: ComponentType;
  meta?: { title?: string; description?: string; order?: number };
};

export type ContentPage = {
  route: string;
  sourcePath: string;
  title: string;
  description?: string;
  order?: number;
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
  return value.replace(/^\d+-/, "").replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// Sort hierarchically: an index page precedes its children; numbered sibling
// directories follow their numeric prefixes (01, 02, 10), not ASCII ordering.
// Optional frontmatter order overrides the final segment's numeric prefix.
export function comparePages(a: Pick<ContentPage, "route" | "order">, b: Pick<ContentPage, "route" | "order">): number {
  const left = a.route.split("/").filter(Boolean);
  const right = b.route.split("/").filter(Boolean);
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] === right[index]) continue;
    const parseSegment = (segment: string, order?: number) => {
      const match = /^(\d+)-(.+)$/.exec(segment);
      return { priority: order ?? (match ? Number(match[1]) : Number.POSITIVE_INFINITY),
        label: match ? match[2] : segment };
    };
    const x = parseSegment(left[index], index === left.length - 1 ? a.order : undefined);
    const y = parseSegment(right[index], index === right.length - 1 ? b.order : undefined);
    if (x.priority !== y.priority) return x.priority - y.priority;
    return x.label.localeCompare(y.label, undefined, { numeric: true });
  }
  return left.length - right.length;
}

// Each page is discovered from its own page.mdx, regardless of source type.
const modules = import.meta.glob(["../../../**/page.mdx", "!../../../node_modules/**", "!../../../apps/**"], {
  eager: true,
}) as Record<string, PageModule>;

function discoverPages(): ContentPage[] {
  return Object.entries(modules).map(([path, module]) => {
    const sourcePath = path.replace(/^\.\.\/\.\.\/\.\.\//, "");
    const directory = sourcePath.replace(/\/page\.mdx$/, "");
    const segments = directory.split("/");
    return {
      route: `/${directory}`,
      sourcePath,
      title: module.meta?.title ?? humanize(segments.at(-1) ?? "Home"),
      description: module.meta?.description,
      order: module.meta?.order,
      Component: module.default,
    };
  }).sort(comparePages);
}

const pages = discoverPages();

export const CONTENT_SECTIONS: ContentSection[] = contentSources.map((source) => ({
  id: source.directory,
  label: source.label,
  description: source.description,
  pages: pages.filter((page) => page.route === `/${source.directory}` ||
    page.route.startsWith(`/${source.directory}/`)),
}));
