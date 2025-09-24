#!/usr/bin/env node
/**
 * Micro:bit shim generator
 * Input: stub JSON describing microbit module symbols (simplified subset)
 * Output: src/python_code_editor/mock/generatedMicrobitAugmentation.ts
 *
 * This avoids manually writing each API wrapper. Real upstream JSON (typeshed.en.json)
 * has a large structure; here we expect a reduced structure placed at
 * scripts/microbit-typeshed.json which can be replaced by the real file later.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INPUT = path.join(__dirname, 'microbit-typeshed.json');
const OUT_FILE = path.join(ROOT, 'src', 'python_code_editor', 'mock', 'generatedMicrobitAugmentation.ts');

function load() {
  if (!fs.existsSync(INPUT)) {
    console.error('[generateMicrobitShim] Missing input stub JSON at', INPUT);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT, 'utf8');
  return JSON.parse(raw);
}

function pascalToSnake(name){
  return name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
}

function emit(moduleSpec){
  const lines = [];
  lines.push('// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.');
  lines.push('// Regenerate with: pnpm run generate:microbit');
  lines.push('/* eslint-disable */');
  lines.push('export interface GeneratedSymbolMeta { name: string; kind: string; doc?: string; signature?: string; }');
  lines.push('export const GENERATED_SYMBOLS: GeneratedSymbolMeta[] = [');
  for (const sym of moduleSpec.symbols){
    const doc = (sym.doc||'').replace(/`/g,'\\`').replace(/\/n/g,' ');
    lines.push(`  { name: '${sym.name}', kind: '${sym.kind}', doc: \`${doc}\`, signature: ${sym.signature?`'${sym.signature}'`:'undefined'} },`);
  }
  lines.push('];');
  lines.push('');
  // Runtime augmentation function merges lightweight stubs into existing module instance
  lines.push('export function augmentMicrobitModule(mod: any){');
  lines.push('  // Functions');
  for (const sym of moduleSpec.symbols.filter(s=>s.kind==='function')){
    const jsName = sym.name.includes('.') ? sym.name.split('.').pop() : sym.name;
    // Skip if already implemented (e.g., display.show)
    lines.push(`  if (mod['${jsName}'] === undefined) { mod['${jsName}'] = (..._args)=>{ console.warn('[microbit stub] ${jsName} not yet simulated'); }; }`);
  }
  lines.push('  // Constants / Images');
  for (const sym of moduleSpec.symbols.filter(s=>s.kind==='constant')){
    // Image.* constants -> attach to Image constructor if available and value is a pattern string
    if (sym.name.startsWith('Image.') && typeof sym.value === 'string') {
      const constName = sym.name.split('.').pop();
      lines.push(`  try { if (mod.Image && mod.Image['${constName}'] === undefined) { mod.Image['${constName}'] = mod.Image('${sym.value}'); } } catch {}`);
      continue;
    }
    // Skip button_a/button_b if already implemented by base module
    if ((sym.name === 'button_a' || sym.name === 'button_b')) {
      lines.push(`  // Skipped generation for ${sym.name} (provided manually)`);
      continue;
    }
    const jsName = sym.name.includes('.') ? sym.name.split('.').pop() : sym.name;
    lines.push(`  if (mod['${jsName}'] === undefined) { mod['${jsName}'] = ${JSON.stringify(sym.value??null)}; }`);
  }
  lines.push('  return mod;');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function main(){
  const spec = load();
  const code = emit(spec);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, code, 'utf8');
  console.log('[generateMicrobitShim] Wrote', path.relative(ROOT, OUT_FILE));
}

main();
