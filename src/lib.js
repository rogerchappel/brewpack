import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildPlan,
  parsePackageFixture,
  renderFormula,
  renderTapReadme,
  resolveOutputPaths,
  validateTapLayout
} from './core.js';

const execFileAsync = promisify(execFile);

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

async function readPlan(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function ownedFormulaFromPlan(plan) {
  const generatedFormula = plan?.generatedFiles?.find((file) => /^Formula\/[a-zA-Z0-9-]+\.rb$/.test(file));
  if (generatedFormula) return generatedFormula;
  if (typeof plan?.formulaName === 'string' && /^[a-zA-Z0-9-]+$/.test(plan.formulaName)) {
    return `Formula/${plan.formulaName}.rb`;
  }
  return null;
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
  const formula = renderFormula(spec);
  const readme = renderTapReadme(spec);
  const planJson = JSON.stringify(plan, null, 2) + '\n';

  if ((await exists(paths.root)) && !force) {
    const current = await fs.readdir(paths.root);
    if (current.length > 0) {
      throw new Error(`Output directory ${paths.root} already exists and is not empty. Use --force to continue.`);
    }
  }

  if (force) {
    const previousPlan = await readPlan(paths.planFile);
    const previousFormula = ownedFormulaFromPlan(previousPlan);
    if (previousFormula && previousFormula !== `Formula/${spec.formulaName}.rb`) {
      await fs.rm(path.join(paths.root, previousFormula), { force: true });
    }
  }

  await fs.mkdir(paths.formulaDir, { recursive: true });
  await fs.writeFile(paths.formulaFile, formula);
  await fs.writeFile(paths.readmeFile, readme);
  await fs.writeFile(paths.planFile, planJson);
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
    const plan = await readPlan(path.join(targetDir, 'brewpack.plan.json'));
    const expectedFormula = ownedFormulaFromPlan(plan);
    if (expectedFormula && !formulas.includes(path.basename(expectedFormula))) {
      return { valid: false, missing: [expectedFormula] };
    }
    const formulaErrors = [];
    for (const formula of formulas.filter((file) => file.endsWith('.rb'))) {
      const relativePath = `Formula/${formula}`;
      const formulaPath = path.join(formulaDir, formula);
      const source = await fs.readFile(formulaPath, 'utf8');
      const hasValidClass = /^class\s+[A-Z][A-Za-z0-9_]*\s+<\s+Formula\s*$/m.test(source);
      if (!hasValidClass) {
        formulaErrors.push(`${relativePath}: must declare a valid Formula subclass (for example, class Demo < Formula)`);
      }
      const checksum = source.match(/^\s*sha256\s+["']([^"']*)["']/m)?.[1];
      if (checksum === 'REPLACE_WITH_SHA256') {
        formulaErrors.push(`${relativePath}: replace REPLACE_WITH_SHA256 with the release archive checksum`);
      } else if (!checksum || !/^[a-fA-F0-9]{64}$/.test(checksum)) {
        formulaErrors.push(`${relativePath}: sha256 must be exactly 64 hexadecimal characters`);
      }
      if (hasValidClass) {
        try {
          await execFileAsync('ruby', ['-c', formulaPath]);
        } catch (error) {
          const diagnostic = String(error.stderr || error.message).trim().split('\n').at(-1);
          formulaErrors.push(`${relativePath}: invalid Ruby syntax: ${diagnostic}`);
        }
      }
    }
    if (formulaErrors.length) {
      return { valid: false, missing: [], errors: formulaErrors };
    }
  }
  return result;
}
