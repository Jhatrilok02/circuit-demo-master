"use client";
import { useEffect, useRef, useState } from "react";
import { SimulatorProxy } from "@/python_code_editor/lib/SimulatorProxy";
import type { MicrobitEvent } from "@/python_code_editor/mock/microbitInstance";
import MicrobitCodeEditor from "@/circuit_canvas/components/core/MicrobitCodeEditor";

const DEFAULT_CODE = `from microbit import *\n\n# Demo: scroll and show a heart\ndisplay.scroll("HI")\ndisplay.show(Image.HEART)\n`; 

function LedMatrix({ matrix }: { matrix: number[][] }) {
  return (
    <div className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(5, 20px)` }}>
      {matrix.map((row, y) =>
        row.map((v, x) => {
          const intensity = v / 9; // 0..1
          const color = `rgba(255,215,0,${0.15 + intensity * 0.85})`;
          const boxShadow = intensity > 0 ? `0 0 ${6 + intensity * 14}px ${color}` : "none";
          return (
            <div
              key={`${x}-${y}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: intensity > 0 ? color : "#222",
                boxShadow,
                transition: "background 80ms, box-shadow 120ms"
              }}
            />
          );
        })
      )}
    </div>
  );
}

export default function MicrobitSimulatorPanel() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [leds, setLeds] = useState<number[][]>(
    () => Array.from({ length: 5 }, () => Array(5).fill(0))
  );
  const [buttons, setButtons] = useState<{A:boolean;B:boolean}>({A:false,B:false});
  const simRef = useRef<SimulatorProxy | null>(null);

  // Init simulator once
  useEffect(() => {
    const sim = new SimulatorProxy({
      language: "python",
      controller: "microbit",
      onOutput: (line: string) => {
        setOutput(o => [...o, line.trimEnd()]);
      },
      onEvent: (ev: MicrobitEvent) => {
        if (ev.type === "led-change") {
          setLeds(prev => {
            const next = prev.map(r => [...r]);
            next[ev.y][ev.x] = ev.value; // matrix is [y][x]
            return next;
          });
        } else if (ev.type === "button-press") {
          setButtons(b => ({...b, [ev.button]: true}));
          setTimeout(()=> setButtons(b => ({...b, [ev.button]: false})), 150);
        } else if (ev.type === "reset") {
          setLeds(Array.from({ length: 5 }, () => Array(5).fill(0)));
        }
      }
    });
    simRef.current = sim;
    sim.initialize();
    return () => { sim.dispose(); };
  }, []);

  const run = async () => {
    if (!simRef.current) return;
    setRunning(true);
    setOutput([]);
    setRunResult(null);
    setLeds(Array.from({ length: 5 }, () => Array(5).fill(0)));
    try {
      const err = await simRef.current.run(code);
      if (err) {
        setOutput(o => [...o, err]);
        setRunResult(err);
      } else {
        setRunResult("OK");
      }
    } finally {
      setRunning(false);
    }
  };

  const pressButton = (name: "A"|"B"|"AB") => {
    simRef.current?.simulateInput(name);
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-5xl mx-auto">
      <div className="flex gap-6 flex-wrap">
        <div className="flex-1 min-w-[340px] h-[480px]">
          <MicrobitCodeEditor code={code} onChange={setCode} />
        </div>
        <div className="w-[260px] flex flex-col gap-4">
          <div className="p-4 rounded-lg border border-white/10 bg-slate-800/60 backdrop-blur">
            <h3 className="text-sm font-semibold text-white mb-3">micro:bit Display</h3>
            <LedMatrix matrix={leds} />
            <div className="flex gap-3 mt-4">
              <button onClick={()=>pressButton("A")} className={`px-3 py-1 rounded bg-indigo-600/60 text-white text-xs ${buttons.A? 'ring-2 ring-yellow-300':''}`}>A</button>
              <button onClick={()=>pressButton("B")} className={`px-3 py-1 rounded bg-indigo-600/60 text-white text-xs ${buttons.B? 'ring-2 ring-yellow-300':''}`}>B</button>
              <button onClick={()=>pressButton("AB")} className="px-3 py-1 rounded bg-indigo-600/40 text-white text-xs">A+B</button>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-white/10 bg-slate-800/60 backdrop-blur h-[160px] overflow-auto text-xs font-mono text-gray-200">
            {output.length === 0 && <span className="opacity-40">(program output)</span>}
            {output.map((l,i)=>(<div key={i}>{l}</div>))}
          </div>
          {runResult !== null && (
            <div className="p-2 rounded-md border border-white/10 bg-black/60 text-xs font-mono text-gray-100">
              <div className="opacity-60">run() returned:</div>
              <div className={runResult === 'OK' ? 'text-green-400' : 'text-red-400'}>
                {runResult}
              </div>
            </div>
          )}
          <button onClick={run} disabled={running} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold shadow">
            {running? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
}
