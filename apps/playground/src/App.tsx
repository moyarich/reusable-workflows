import { MDXProvider } from "@mdx-js/react";
import type { ComponentPropsWithoutRef } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CONTENT_SECTIONS, type ContentPage } from "./content";
import { Playground } from "./Playground";

const allPages = CONTENT_SECTIONS.flatMap((section) => section.pages);

function resolveMdxHref(page: ContentPage, href?: string) {
  if (!href) return null;
  if (href.startsWith("#")) return `${page.route}${href}`;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return null;
  const [path, fragment = ""] = href.split("#", 2);
  if (!path || !path.endsWith(".mdx")) return null;
  const sourcePath = page.sourcePath;

  const segments = sourcePath.split("/").slice(0, -1);
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }

  const match = allPages.find((candidate) => candidate.sourcePath === segments.join("/"));
  return match ? `${match.route}${fragment ? `#${fragment}` : ""}` : null;
}

function MdxLink({
  page,
  href,
  children,
  ...props
}: ComponentPropsWithoutRef<"a"> & { page: ContentPage }) {
  const route = resolveMdxHref(page, href);
  return route ? (
    <Link to={route} {...props}>{children}</Link>
  ) : (
    <a href={href} {...props}>{children}</a>
  );
}

function ContentRoute() {
  const location = useLocation();
  const page = allPages.find((candidate) => candidate.route === location.pathname);

  if (!page) {
    return (
      <article className="content-page">
        <p className="eyebrow">Not found</p>
        <h1>Page not found</h1>
        <p>Choose documentation or a workflow example from the navigation.</p>
      </article>
    );
  }

  const Page = page.Component;
  return (
    <article className="content-page">
      <p className="eyebrow">{page.sourcePath}</p>
      <MDXProvider
        components={{
          Playground,
          a: (props) => <MdxLink {...props} page={page} />,
        }}
      >
        <Page />
      </MDXProvider>
    </article>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">moyarich/reusable-workflows</p>
          <h1>Reusable GitHub Workflows</h1>
          <p>Documentation and real, copyable caller workflows for the supported workflow and action surface.</p>
        </div>
        <a href="https://github.com/moyarich/reusable-workflows">GitHub repository</a>
      </header>

      <div className="playground-layout">
        <aside className="sidebar" aria-label="Documentation navigation">
          {CONTENT_SECTIONS.map((section) => (
            <section key={section.id} className="sidebar-section">
              <h2>{section.label}</h2>
              <p>{section.description}</p>
              <nav>
                {section.pages.map((page) => (
                  <Link key={page.route} to={page.route}>{page.title}</Link>
                ))}
              </nav>
            </section>
          ))}
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/docs" replace />} />
            <Route path="*" element={<ContentRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
