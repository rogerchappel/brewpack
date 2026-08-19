import path from 'node:path';

function ensureObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function ensureNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function parseBinaries(value, slug) {
  if (value === undefined) return [slug];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('fixture.package.binaries must be a non-empty array.');
  }
  value.forEach((binary, index) => {
    if (typeof binary !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(binary)) {
      throw new Error(`fixture.package.binaries[${index}] must be a valid executable name.`);
    }
  });
  if (new Set(value).size !== value.length) {
    throw new Error('fixture.package.binaries must not contain duplicates.');
  }
  return value;
}

function parseCaveats(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error('fixture.package.caveats must be an array of strings.');
  }
  value.forEach((caveat, index) => {
    if (typeof caveat !== 'string') {
      throw new Error(`fixture.package.caveats[${index}] must be a string.`);
    }
  });
  return value;
}

function parseArtifact(raw, binaries) {
  if (!Array.isArray(raw.artifacts) || raw.artifacts.length !== 1) {
    throw new Error('fixture.artifacts must contain exactly one release artifact.');
  }
  const artifact = raw.artifacts[0];
  ensureObject(artifact, 'fixture.artifacts[0]');
  ensureObject(artifact.install, 'fixture.artifacts[0].install');
  if (typeof artifact.url !== 'string' || !/^https?:\/\/\S+$/.test(artifact.url)) {
    throw new Error('fixture.artifacts[0].url must be an absolute HTTP(S) URL.');
  }

  const declared = Object.keys(artifact.install);
  const missing = binaries.filter((binary) => !declared.includes(binary));
  const unknown = declared.filter((binary) => !binaries.includes(binary));
  if (missing.length || unknown.length) {
    const details = [
      missing.length ? `missing install paths for: ${missing.join(', ')}` : '',
      unknown.length ? `undeclared binaries: ${unknown.join(', ')}` : ''
    ].filter(Boolean).join('; ');
    throw new Error(`fixture.artifacts[0].install must match fixture.package.binaries (${details}).`);
  }

  for (const [binary, source] of Object.entries(artifact.install)) {
    if (
      typeof source !== 'string'
      || !source
      || path.isAbsolute(source)
      || source.split(/[\\/]/).includes('..')
    ) {
      throw new Error(`fixture.artifacts[0].install.${binary} must be a relative path inside the artifact.`);
    }
  }
  return { url: artifact.url, install: artifact.install };
}

export function parsePackageFixture(raw) {
  ensureObject(raw, 'fixture');
  const { package: pkg, tap } = raw;
  ensureObject(pkg, 'fixture.package');

  for (const field of ['name', 'version', 'description', 'license']) {
    ensureNonEmptyString(pkg[field], `fixture.package.${field}`);
  }

  const slug = pkg.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (!slug) {
    throw new Error('fixture.package.name must produce a non-empty Homebrew formula slug.');
  }
  if (tap !== undefined) ensureObject(tap, 'fixture.tap');
  const homepage = pkg.homepage ?? `https://example.com/${slug}`;
  const repository = pkg.repository ?? homepage;
  const owner = tap?.owner ?? 'acme';
  const repo = tap?.repo ?? `homebrew-${slug}`;
  if (typeof owner !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner)) {
    throw new Error('fixture.tap.owner must be a valid GitHub owner.');
  }
  if (
    typeof repo !== 'string'
    || repo.length > 100
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo)
    || repo === '.'
    || repo === '..'
  ) {
    throw new Error('fixture.tap.repo must be a valid GitHub repository name.');
  }
  const camelizedSlug = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  const formulaClass = /^\d/.test(camelizedSlug) ? `V${camelizedSlug}` : camelizedSlug;

  const binaries = parseBinaries(pkg.binaries, slug);
  const caveats = parseCaveats(pkg.caveats);
  const artifact = parseArtifact(raw, binaries);
  if (pkg.test !== undefined) {
    ensureObject(pkg.test, 'fixture.package.test');
    ensureNonEmptyString(pkg.test.command, 'fixture.package.test.command');
    ensureNonEmptyString(pkg.test.expect, 'fixture.package.test.expect');
  }
  return {
    slug,
    formulaName: slug,
    formulaClass,
    packageName: pkg.name,
    version: pkg.version,
    description: pkg.description,
    license: pkg.license,
    homepage,
    repository,
    owner,
    repo,
    binaries,
    install: pkg.install ?? {},
    caveats,
    test: pkg.test ?? { command: `${slug} --help`, expect: 'Usage' },
    artifact
  };
}

export function renderFormula(spec) {
  const caveatBlock = spec.caveats.length
    ? `\n  def caveats\n    <<~EOS\n${spec.caveats.map((line) => `      ${line}`).join('\n')}\n    EOS\n  end\n`
    : '';

  const installLines = spec.binaries
    .map((bin) => {
      const source = spec.artifact.install[bin];
      const sourceBasename = path.posix.basename(source.replaceAll('\\', '/'));
      const destination = sourceBasename === bin ? '' : ` => ${JSON.stringify(bin)}`;
      return `    bin.install ${JSON.stringify(source)}${destination}`;
    })
    .join('\n');
  const command = spec.test.command.trim();
  const separator = command.search(/\s/);
  const executable = separator === -1 ? command : command.slice(0, separator);
  const argumentsText = separator === -1 ? '' : command.slice(separator);
  if (!spec.binaries.includes(executable)) {
    throw new Error(`fixture.package.test.command must start with a declared binary: ${spec.binaries.join(', ')}.`);
  }
  const testCommand = `#{bin}/${executable}${argumentsText.replaceAll('#{', '\\#{')}`;

  return `class ${spec.formulaClass} < Formula\n  desc ${JSON.stringify(spec.description)}\n  homepage ${JSON.stringify(spec.homepage)}\n  url ${JSON.stringify(spec.artifact.url)}\n  sha256 ${JSON.stringify('REPLACE_WITH_SHA256')}\n  license ${JSON.stringify(spec.license)}\n\n  def install\n${installLines}\n  end\n\n  test do\n    output = shell_output(${JSON.stringify(testCommand)})\n    assert_match ${JSON.stringify(spec.test.expect)}, output\n  end${caveatBlock || '\n'}end\n`;
}

export function renderTapReadme(spec) {
  return `# homebrew-${spec.repo.replace(/^homebrew-/, '')}

Generated by brewpack for **${spec.packageName}**.

## Install

\`\`\`sh
brew tap ${spec.owner}/${spec.repo}
brew install ${spec.formulaName}
\`\`\`

## Update checklist

1. Build the release artifact containing: ${Object.values(spec.artifact.install).map((item) => `\`${item}\``).join(', ')}.
2. Upload it to \`${spec.artifact.url}\`.
3. Download that exact URL and replace the formula SHA256 with its checksum.
4. Run \`brewpack validate .\` from the tap repo root.

## Safety

- No hidden network calls are made by brewpack.
- Publishing is always manual and documented.
- Review generated formula paths before committing.
`;
}


export function buildPlan(spec) {
  return {
    packageName: spec.packageName,
    formulaName: spec.formulaName,
    formulaClass: spec.formulaClass,
    tapRepository: `${spec.owner}/${spec.repo}`,
    releaseArchiveUrl: spec.artifact.url,
    artifactInstall: spec.artifact.install,
    binaries: spec.binaries,
    caveats: spec.caveats,
    generatedFiles: [
      `Formula/${spec.formulaName}.rb`,
      'README.md',
      'brewpack.plan.json'
    ],
    nextSteps: [
      `Build the release artifact with: ${Object.values(spec.artifact.install).join(', ')}.`,
      `Download ${spec.artifact.url} and generate its SHA256.`,
      'Commit generated Formula and README files to the tap repository.'
    ]
  };
}

export function validateTapLayout(files) {
  const required = ['Formula', 'README.md'];
  const missing = required.filter((item) => !files.includes(item));
  return {
    valid: missing.length === 0,
    missing
  };
}

export function resolveOutputPaths(outputDir, spec) {
  return {
    root: outputDir,
    formulaDir: path.join(outputDir, 'Formula'),
    formulaFile: path.join(outputDir, 'Formula', `${spec.formulaName}.rb`),
    readmeFile: path.join(outputDir, 'README.md'),
    planFile: path.join(outputDir, 'brewpack.plan.json')
  };
}
