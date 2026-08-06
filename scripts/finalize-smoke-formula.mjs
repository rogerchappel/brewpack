import fs from 'node:fs/promises';

const formulaPath = process.argv[2];
const source = await fs.readFile(formulaPath, 'utf8');
await fs.writeFile(formulaPath, source.replace('REPLACE_WITH_SHA256', '0'.repeat(64)));
