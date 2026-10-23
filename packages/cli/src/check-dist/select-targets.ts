/** Pure distribution target selection. No process, filesystem, or network access. */
export type Package = {
  name: string;
  directory: string;
  [key: string]: unknown;
};
export type Config = {
  packages?: Record<
    string,
    { distPath?: string; buildCommand?: string; commitDist?: boolean }
  >;
  extraPackages?: Package[];
};
export type SelectionOptions = {
  discovered: Package[];
  config: Config;
  requested: string;
  distPathOverride?: string;
  buildCommandOverride?: string;
};

/** Produce a GitHub Actions matrix from explicit inputs. Does not mutate inputs. */
export function selectDistributionTargets({
  discovered,
  config,
  requested,
  distPathOverride = "",
  buildCommandOverride = "",
}: SelectionOptions) {
  const overrides = config.packages ?? {};
  const available = [...discovered, ...(config.extraPackages ?? [])];
  const selected =
    requested === "all"
      ? available
      : available.filter(
          (p) => p.directory === requested || p.name === requested,
        );
  if (selected.length === 0) throw new Error("No packages match: " + requested);
  const include = selected.map((p) => {
    const settings = {
      ...(overrides.all ?? {}),
      ...(overrides[p.name] ?? {}),
      ...(overrides[p.directory] ?? {}),
    };
    const dir = p.directory === "." ? "root" : p.directory;
    return {
      ...p,
      artifactSuffix: dir
        .replace(/^(packages|apps)\//, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-"),
      commitDist: settings.commitDist ?? false,
      distTemplate:
        distPathOverride || settings.distPath || "{packageDir}/dist",
      buildCommand:
        buildCommandOverride ||
        settings.buildCommand ||
        (p.directory === "."
          ? "npm run build"
          : "npm run build --workspace " + p.name),
    };
  });
  return {
    matrix: { include },
    hasPackages: true,
    singlePackage: selected.length === 1,
    directories: selected.map((p) => p.directory),
  };
}
