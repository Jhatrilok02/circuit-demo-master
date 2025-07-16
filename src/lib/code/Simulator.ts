import { PythonInterpreter } from "@/lib/code/interpreter/PythonInterpreter";
import { MicrobitSimulator } from "@/lib/code/mock/microbitInstance";
import type { MicrobitEvent } from "@/lib/code/mock/microbitInstance";

type SupportedLanguage = "python";
type SupportedController = "microbit";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

export class Simulator {
  private interpreter: PythonInterpreter;
  private microbit: MicrobitSimulator | null = null;

  constructor(private options: SimulatorOptions) {
    if (options.language == "python") {
      this.interpreter = new PythonInterpreter(true);
    } else {
      throw new Error(`Unsupported language: ${options.language}`);
    }
  }

  async initialize() {
    await this.interpreter.initialize();

    if (this.options.onOutput) {
      this.interpreter.setOutputCallback(this.options.onOutput);
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

      if (this.options.onEvent) {
        this.microbit.subscribe(this.options.onEvent);
      }

      this.microbit.reset();
    }
  }

  async run(code: string): Promise<string> {
    if (!this.interpreter.isInitialized()) {
      throw new Error("Simulator not initialized. Call initialize() first.");
    }

    // reset states of microbit
    this.microbit?.reset();
    return await this.interpreter.run(code);
  }

  getStates() {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    return this.microbit.getStateSnapshot();
  }

  getMicrobitInstance(): MicrobitSimulator | null {
    return this.microbit;
  }
}
