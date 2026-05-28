import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildPlan,
  packageJsonToFixture,
  parsePackageFixture,
  renderFormula,
  renderTapReadme,
  resolveOutputPaths,
  validateTapLayout,
  type BrewpackPlan,
  type PackageSpec
} from './core.js';

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFixture(inputDir: string): Promise<unknown> {
  const fixturePath = path.join(inputDir, 'brewpack.fixture.json');
  if (await exists(fixturePath)) return readJson(fixturePath);

  const packageJsonPath = path.join(inputDir, 'package.json');
  if (await exists(packageJsonPath)) return packageJsonToFixture(await readJson(packageJsonPath));

  throw new Error(`No brewpack.fixture.json or package.json found in ${inputDir}.`);
}

export interface InspectionResult {
  spec: PackageSpec;
  plan: BrewpackPlan;
}

export interface InitTapOptions {
  force?: boolean;
  dryRun?: boolean;
}

export async function inspectProject(inputDir: string): Promise<InspectionResult> {
  const fixture = await readFixture(inputDir);
  const spec = parsePackageFixture(fixture);
  const plan = buildPlan(spec);
  return { spec, plan };
}

export async function previewTap(inputDir: string, outputDir: string) {
  const { spec, plan } = await inspectProject(inputDir);
  const paths = resolveOutputPaths(outputDir, spec);
  return {
    spec,
    plan,
    paths,
    files: {
      [path.relative(outputDir, paths.formulaFile)]: renderFormula(spec),
      [path.relative(outputDir, paths.readmeFile)]: renderTapReadme(spec),
      [path.relative(outputDir, paths.planFile)]: JSON.stringify(plan, null, 2) + '\n'
    }
  };
}

export async function initTap(inputDir: string, outputDir: string, { force = false, dryRun = false }: InitTapOptions = {}) {
  const preview = await previewTap(inputDir, outputDir);
  const { paths, files } = preview;

  if (dryRun) return { ...preview, written: false };

  if ((await exists(paths.root)) && !force) {
    const current = await fs.readdir(paths.root);
    if (current.length > 0) {
      throw new Error(`Output directory ${paths.root} already exists and is not empty. Use --force to continue.`);
    }
  }

  await fs.mkdir(paths.formulaDir, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([relativePath, contents]) => fs.writeFile(path.join(paths.root, relativePath), contents))
  );
  return { ...preview, written: true };
}

export async function validateTap(targetDir: string) {
  const entries = await fs.readdir(targetDir);
  const formulaDir = path.join(targetDir, 'Formula');
  const formulaEntries = entries.includes('Formula') ? await fs.readdir(formulaDir) : [];
  return validateTapLayout(entries, formulaEntries);
}
