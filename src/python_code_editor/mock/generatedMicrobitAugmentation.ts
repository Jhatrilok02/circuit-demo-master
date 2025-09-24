// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Regenerate with: pnpm run generate:microbit
/* eslint-disable */
export interface GeneratedSymbolMeta { name: string; kind: string; doc?: string; signature?: string; }
export const GENERATED_SYMBOLS: GeneratedSymbolMeta[] = [
  { name: 'accelerometer.get_x', kind: 'function', doc: `Get X axis acceleration (mg).`, signature: '() -> int' },
  { name: 'accelerometer.get_y', kind: 'function', doc: `Get Y axis acceleration (mg).`, signature: '() -> int' },
  { name: 'accelerometer.get_z', kind: 'function', doc: `Get Z axis acceleration (mg).`, signature: '() -> int' },
  { name: 'button_a', kind: 'constant', doc: `Button A singleton.`, signature: undefined },
  { name: 'button_b', kind: 'constant', doc: `Button B singleton.`, signature: undefined },
  { name: 'Image.HEART', kind: 'constant', doc: `Heart image.`, signature: undefined },
  { name: 'Image.HAPPY', kind: 'constant', doc: `Happy face.`, signature: undefined },
  { name: 'display.scroll', kind: 'function', doc: `Scroll text across the display.`, signature: '(text: str, delay: int = 150) -> None' },
  { name: 'sleep', kind: 'function', doc: `Delay for ms milliseconds.`, signature: '(ms: int) -> None' },
];

export function augmentMicrobitModule(mod: any){
  // Functions
  if (mod['get_x'] === undefined) { mod['get_x'] = (..._args)=>{ console.warn('[microbit stub] get_x not yet simulated'); }; }
  if (mod['get_y'] === undefined) { mod['get_y'] = (..._args)=>{ console.warn('[microbit stub] get_y not yet simulated'); }; }
  if (mod['get_z'] === undefined) { mod['get_z'] = (..._args)=>{ console.warn('[microbit stub] get_z not yet simulated'); }; }
  if (mod['scroll'] === undefined) { mod['scroll'] = (..._args)=>{ console.warn('[microbit stub] scroll not yet simulated'); }; }
  if (mod['sleep'] === undefined) { mod['sleep'] = (..._args)=>{ console.warn('[microbit stub] sleep not yet simulated'); }; }
  // Constants / Images
  // Skipped generation for button_a (provided manually)
  // Skipped generation for button_b (provided manually)
  try { if (mod.Image && mod.Image['HEART'] === undefined) { mod.Image['HEART'] = mod.Image('09090:99999:99999:09990:00900'); } } catch {}
  try { if (mod.Image && mod.Image['HAPPY'] === undefined) { mod.Image['HAPPY'] = mod.Image('00000:09090:00000:90009:09990'); } } catch {}
  return mod;
}
