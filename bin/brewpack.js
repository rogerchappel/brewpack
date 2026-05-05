#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { inspectProject, initTap, validateTap } from '../src/lib.js';

function printHelp() {
  console.log(`brewpack - local-first Homebrew tap scaffolding\n\nUsage:\n  brewpack inspect <fixture-dir> [--output <dir>] [--format json|text|both]\n  brewpack init <fixture-dir> --output <dir> [--force]\n  brewpack validate <tap-dir>\n  brewpack --help\n\nCommands:\n  inspect   Read a local fixture and emit a tap plan\n  init      Generate a tap skeleton with Formula and README\n  validate  Check a generated tap layout\n\nSafety:\n  - Only reads local files you point it at\n  - Never publishes or calls the network\n  - Use generated output as a starting point, not blind truth\n`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (!next || next.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      options._.push(token);
    }
  }
  return { command, options };
}

function renderTextInspection(payload) {
  return [
    `Package: ${payload.spec.packageName}@${payload.spec.version}`,
    `Formula: ${payload.spec.formulaClass} -> ${payload.spec.formulaName}.rb`,
    `Tap: ${payload.plan.tapRepository}`,
    `Release archive: ${payload.plan.releaseArchiveUrl}`,
    `Binaries: ${payload.plan.binaries.join(', ')}`,
    `Next:`,
    ...payload.plan.nextSteps.map((step) => `- ${step}`)
  ].join('\n');
}

async function ensureOutput(outputDir, plan, text) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'inspection.json'), JSON.stringify(plan, null, 2) + '\n');
  await fs.writeFile(path.join(outputDir, 'inspection.txt'), text + '\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  const { command, options } = parseArgs(argv);

  if (command === 'inspect') {
    const inputDir = options._[0];
    if (!inputDir) throw new Error('inspect requires <fixture-dir>.');
    const payload = await inspectProject(inputDir);
    const text = renderTextInspection(payload);
    const format = options.format ?? 'text';
    if (options.output) {
      await ensureOutput(options.output, payload, text);
    }
    if (format === 'json') {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    if (format === 'both') {
      console.log(text);
      console.log('\n---');
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    console.log(text);
    return;
  }

  if (command === 'init') {
    const inputDir = options._[0];
    const outputDir = options.output;
    if (!inputDir || !outputDir) throw new Error('init requires <fixture-dir> and --output <dir>.');
    const result = await initTap(inputDir, outputDir, { force: Boolean(options.force) });
    console.log(`Generated tap scaffold in ${result.paths.root}`);
    console.log(`Formula: ${path.relative(process.cwd(), result.paths.formulaFile)}`);
    return;
  }

  if (command === 'validate') {
    const targetDir = options._[0];
    if (!targetDir) throw new Error('validate requires <tap-dir>.');
    const result = await validateTap(targetDir);
    if (!result.valid) {
      console.error(`Invalid tap layout. Missing: ${result.missing.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    console.log('Tap layout looks valid.');
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
