import path from 'node:path';

export interface PackageInput {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage?: string;
  repository?: string | { url?: string };
  binaries?: string[];
  caveats?: string[];
  test?: {
    command?: string;
    expect?: string;
  };
}

export interface FixtureInput {
  package: PackageInput;
  tap?: {
    owner?: string;
    repo?: string;
  };
  artifacts?: unknown[];
}

export interface PackageSpec {
  slug: string;
  formulaName: string;
  formulaClass: string;
  packageName: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repository: string;
  owner: string;
  repo: string;
  binaries: string[];
  caveats: string[];
  test: {
    command: string;
    expect: string;
  };
  artifacts: unknown[];
}

export interface BrewpackPlan {
  packageName: string;
  formulaName: string;
  formulaClass: string;
  tapRepository: string;
  releaseArchiveUrl: string;
  binaries: string[];
  caveats: string[];
  generatedFiles: string[];
  nextSteps: string[];
}

export interface TapValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

function ensureObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function stringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  return value.map((item) => item.trim());
}

function normalizeRepository(repository: PackageInput['repository'], homepage: string): string {
  if (typeof repository === 'string' && repository.trim()) return repository.trim().replace(/^git\+/, '');
  if (repository && typeof repository === 'object' && typeof repository.url === 'string') {
    return repository.url.trim().replace(/^git\+/, '').replace(/\.git$/, '');
  }
  return homepage;
}

export function packageJsonToFixture(raw: unknown): FixtureInput {
  ensureObject(raw, 'package.json');
  const bin = raw.bin;
  const binaries =
    typeof bin === 'string'
      ? [String(raw.name ?? '')]
      : bin && typeof bin === 'object' && !Array.isArray(bin)
        ? Object.keys(bin)
        : undefined;

  return {
    package: {
      name: ensureString(raw.name, 'package.json.name'),
      version: ensureString(raw.version, 'package.json.version'),
      description: ensureString(raw.description, 'package.json.description'),
      license: ensureString(raw.license, 'package.json.license'),
      homepage: typeof raw.homepage === 'string' ? raw.homepage : undefined,
      repository: raw.repository as PackageInput['repository'],
      binaries
    }
  };
}

export function parsePackageFixture(raw: unknown): PackageSpec {
  ensureObject(raw, 'fixture');
  const pkg = raw.package;
  const tap = raw.tap;
  ensureObject(pkg, 'fixture.package');
  if (tap !== undefined) ensureObject(tap, 'fixture.tap');

  const packageName = ensureString(pkg.name, 'fixture.package.name');
  const version = ensureString(pkg.version, 'fixture.package.version');
  const description = ensureString(pkg.description, 'fixture.package.description');
  const license = ensureString(pkg.license, 'fixture.package.license');
  const slug = packageName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (!slug) throw new Error('fixture.package.name must contain at least one alphanumeric character.');

  const homepage = typeof pkg.homepage === 'string' && pkg.homepage.trim() ? pkg.homepage.trim() : `https://example.com/${slug}`;
  const repository = normalizeRepository(pkg.repository as PackageInput['repository'], homepage);
  const owner = typeof tap?.owner === 'string' && tap.owner.trim() ? tap.owner.trim() : 'acme';
  const repo = typeof tap?.repo === 'string' && tap.repo.trim() ? tap.repo.trim() : `homebrew-${slug}`;
  const binaries = stringArray(pkg.binaries, 'fixture.package.binaries') ?? [slug];
  const caveats = stringArray(pkg.caveats, 'fixture.package.caveats') ?? [];
  const testInput = pkg.test;
  if (testInput !== undefined) ensureObject(testInput, 'fixture.package.test');

  const formulaClass = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

  return {
    slug,
    formulaName: slug,
    formulaClass,
    packageName,
    version,
    description,
    license,
    homepage,
    repository,
    owner,
    repo,
    binaries,
    caveats,
    test: {
      command: typeof testInput?.command === 'string' && testInput.command.trim() ? testInput.command.trim() : `${slug} --help`,
      expect: typeof testInput?.expect === 'string' && testInput.expect.trim() ? testInput.expect.trim() : 'Usage'
    },
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : []
  };
}

export function renderFormula(spec: PackageSpec): string {
  const caveatBlock = spec.caveats.length
    ? `\n  def caveats\n    <<~EOS\n${spec.caveats.map((line) => `      ${line}`).join('\n')}\n    EOS\n  end\n`
    : '';

  const installLines = spec.binaries.map((bin) => `    bin.install "dist/${bin}"`).join('\n');
  const testCommand = spec.test.command.replace(spec.binaries[0], `#{bin}/${spec.binaries[0]}`);

  return `class ${spec.formulaClass} < Formula\n  desc ${JSON.stringify(spec.description)}\n  homepage ${JSON.stringify(spec.homepage)}\n  url ${JSON.stringify(`${spec.repository}/archive/refs/tags/v${spec.version}.tar.gz`)}\n  sha256 ${JSON.stringify('REPLACE_WITH_SHA256')}\n  license ${JSON.stringify(spec.license)}\n\n  def install\n${installLines}\n  end\n\n  test do\n    output = shell_output(${JSON.stringify(testCommand)})\n    assert_match ${JSON.stringify(spec.test.expect)}, output\n  end${caveatBlock}end\n`;
}

export function renderTapReadme(spec: PackageSpec): string {
  return `# ${spec.repo}\n\nGenerated by brewpack for **${spec.packageName}**.\n\n## Install\n\n\`\`\`bash\nbrew tap ${spec.owner}/${spec.repo}\nbrew install ${spec.formulaName}\n\`\`\`\n\n## Update checklist\n\n1. Build release artifacts locally.\n2. Upload them to a GitHub release for \`v${spec.version}\`.\n3. Replace the formula SHA256 after downloading the tarball.\n4. Run \`brewpack validate .\` from the tap repo root.\n\n## Safety\n\n- No hidden network calls are made by brewpack.\n- Publishing is always manual and documented.\n- Review generated formula paths before committing.\n`;
}

export function buildPlan(spec: PackageSpec): BrewpackPlan {
  return {
    packageName: spec.packageName,
    formulaName: spec.formulaName,
    formulaClass: spec.formulaClass,
    tapRepository: `${spec.owner}/${spec.repo}`,
    releaseArchiveUrl: `${spec.repository}/archive/refs/tags/v${spec.version}.tar.gz`,
    binaries: spec.binaries,
    caveats: spec.caveats,
    generatedFiles: [`Formula/${spec.formulaName}.rb`, 'README.md', 'brewpack.plan.json'],
    nextSteps: [
      'Build release artifacts into dist/.',
      'Generate or verify the GitHub release tarball hash.',
      'Commit generated Formula and README files to the tap repository.'
    ]
  };
}

export function validateTapLayout(entries: string[], formulaEntries: string[] = []): TapValidationResult {
  const missing = [];
  const warnings = [];
  if (!entries.includes('Formula')) missing.push('Formula');
  if (!entries.includes('README.md')) missing.push('README.md');
  if (entries.includes('Formula') && !formulaEntries.some((entry) => entry.endsWith('.rb'))) {
    missing.push('Formula/*.rb');
  }
  if (formulaEntries.some((entry) => entry.includes(' '))) {
    warnings.push('Formula filenames should not contain spaces.');
  }
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

export function resolveOutputPaths(outputDir: string, spec: PackageSpec) {
  return {
    root: outputDir,
    formulaDir: path.join(outputDir, 'Formula'),
    formulaFile: path.join(outputDir, 'Formula', `${spec.formulaName}.rb`),
    readmeFile: path.join(outputDir, 'README.md'),
    planFile: path.join(outputDir, 'brewpack.plan.json')
  };
}
