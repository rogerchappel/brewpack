import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildPlan,
  parsePackageFixture,
  renderFormula,
  renderTapReadme,
  resolveOutputPaths,
  validateTapLayout
} from './core.js';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function inspectProject(inputDir) {
  const fixture = await readJson(path.join(inputDir, 'brewpack.fixture.json'));
  const spec = parsePackageFixture(fixture);
  const plan = buildPlan(spec);
  return { spec, plan };
}

export async function initTap(inputDir, outputDir, { force = false } = {}) {
  const { spec, plan } = await inspectProject(inputDir);
  const paths = resolveOutputPaths(outputDir, spec);

  if ((await exists(paths.root)) && !force) {
    const current = await fs.readdir(paths.root);
    if (current.length > 0) {
      throw new Error(`Output directory ${paths.root} already exists and is not empty. Use --force to continue.`);
    }
  }

  await fs.mkdir(paths.formulaDir, { recursive: true });
  await fs.writeFile(paths.formulaFile, renderFormula(spec));
  await fs.writeFile(paths.readmeFile, renderTapReadme(spec));
  await fs.writeFile(paths.planFile, JSON.stringify(plan, null, 2) + '\n');
  return { spec, plan, paths };
}

export async function validateTap(targetDir) {
  const entries = await fs.readdir(targetDir);
  const result = validateTapLayout(entries);
  const formulaDir = path.join(targetDir, 'Formula');
  if (result.valid) {
    const formulas = await fs.readdir(formulaDir);
    if (!formulas.some((file) => file.endsWith('.rb'))) {
      return { valid: false, missing: ['Formula/*.rb'] };
    }
  }
  return result;
}
