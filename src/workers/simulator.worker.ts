// src/workers/simulator.worker.ts
import * as Comlink from "comlink";
import { PythonInterpreter } from "@/lib/code/interpreter/PythonInterpreter";
import { MicrobitSimulator } from "@/lib/code/mock/microbitInstance";
import type { MicrobitEvent } from "@/lib/code/mock/microbitInstance";

type SupportedLanguage = "python";
type SupportedController = "microbit";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
}

class Simulator {
  private interpreter: PythonInterpreter | null = null;
  private microbit: MicrobitSimulator | null = null;

  private onOutput?: (line: string) => void;
  private onEvent?: (event: MicrobitEvent) => void;

  private options: SimulatorOptions;

  constructor(opts: SimulatorOptions) {
    this.options = opts;
  }

  async initialize(
    onOutput?: Comlink.Remote<(line: string) => void>,
    onEvent?: Comlink.Remote<(event: MicrobitEvent) => void>
  ) {
    this.onOutput = onOutput as (line: string) => void;
    this.onEvent = onEvent as (event: MicrobitEvent) => void;

    if (this.options.language !== "python") {
      throw new Error(`Unsupported language: ${this.options.language}`);
    }

    this.interpreter = new PythonInterpreter(true);
    await this.interpreter.initialize();

    if (this.onOutput) {
      this.interpreter.setOutputCallback(this.onOutput);
    }

    if (
      this.options.language === "python" &&
      this.options.controller === "microbit"
    ) {
      this.microbit = new MicrobitSimulator(this.interpreter.getPyodide()!);
      this.interpreter.registerHardwareModule(
        "microbit",
        this.microbit.getPythonModule()
      );

      if (this.onEvent) {
        this.microbit.subscribe(this.onEvent);
      }

      this.microbit.reset();
    }
  }

  async dispose() {
    try {
      // Stop any running tasks or clear state
      await this.interpreter?.run(`
      import asyncio
      for task in asyncio.all_tasks():
          task.cancel()
    `);
    } catch (e) {
      console.warn("Dispose error:", e);
    }
  }

  async run(code: string): Promise<string> {
    if (!this.interpreter || !this.interpreter.isInitialized()) {
      throw new Error("Simulator not initialized. Call initialize() first.");
    }

    this.microbit?.reset();
    return this.interpreter.run(code);
  }

  getStates() {
    if (!this.microbit) {
      throw new Error("Microbit controller not initialized.");
    }
    return this.microbit.getStateSnapshot();
  }

  reset() {
    if (!this.microbit) {
      throw new Error("Microbit controller not initialized.");
    }
    console.log("Resetting microbit state");
    this.microbit.reset();
  }
}

Comlink.expose(Simulator);
