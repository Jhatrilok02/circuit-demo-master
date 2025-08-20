// microbitInstance.tsx

import type { PyodideInterface } from "pyodide";
import { CHARACTER_PATTERNS } from "./characterPatterns";

export type MicrobitEvent =
  | {
      type: "pin-change";
      pin: string;
      value: number;
      pinType: "digital" | "analog";
    }
  | { type: "led-change"; x: number; y: number; value: number }
  | { type: "button-press"; button: "A" | "B" }
  | { type: "reset" };

type MicrobitEventCallback = (event: MicrobitEvent) => void;

class ButtonInstance {
  constructor(private name: "A" | "B") {}

  getName(): "A" | "B" {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

class MicrobitEventEmitter {
  private listeners: Set<MicrobitEventCallback> = new Set();

  subscribe(callback: MicrobitEventCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event: MicrobitEvent) {
    for (const cb of this.listeners) {
      cb(event);
    }
  }
}

export class MicrobitSimulator {

  private digitalWriteListeners: Record<string, Set<(value: number) => void>> = {};

  public readonly pins = {
    digital_write_pin: this.digitalWritePin.bind(this),
    digital_read_pin: this.readDigitalPin.bind(this),
    analog_write_pin: this.analogWritePin.bind(this),
    read_analog_pin: this.readAnalogPin.bind(this),

    // NEW: subscribe to writes on a specific digital pin
    onDigitalWrite: (pin: string, cb: (value: number) => void) => {
      debugger;
      if (!this.digitalWriteListeners[pin]) this.digitalWriteListeners[pin] = new Set();
      this.digitalWriteListeners[pin].add(cb);
      return () => this.digitalWriteListeners[pin].delete(cb);
    },
  };


  // NEW: Allow external components to set pin values (for sensor simulation)
  private externalPinValues: Record<string, { digital: number; analog: number }> = {};

  // Method for external components (like sensors) to set pin values
  public setExternalPinValue(pin: string, value: number, type: 'digital' | 'analog' = 'digital') {
    if (!this.externalPinValues[pin]) {
      this.externalPinValues[pin] = { digital: 0, analog: 0 };
    }
    this.externalPinValues[pin][type] = value;
  }

  // Update the read methods to check external values first
  private readDigitalPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.digital !== undefined) {
      return this.externalPinValues[pin].digital;
    }
    return this.pinStates[pin].digital;
  }

  private readAnalogPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.analog !== undefined) {
      return this.externalPinValues[pin].analog;
    }
    return this.pinStates[pin].analog;
  }

  // NEW: Method to get access to pin operations for external components
  public getPinController() {
    return {
      onDigitalWrite: (pin: string, cb: (value: number) => void) => {
        if (!this.digitalWriteListeners[pin]) {
          this.digitalWriteListeners[pin] = new Set();
        }
        this.digitalWriteListeners[pin].add(cb);
        return () => this.digitalWriteListeners[pin].delete(cb);
      },
      setDigitalValue: (pin: string, value: number) => {
        this.setExternalPinValue(pin, value, 'digital');
      },
      setAnalogValue: (pin: string, value: number) => {
        this.setExternalPinValue(pin, value, 'analog');
      }
    };
  }

  private digitalWritePin(pin: string, value: number) {
    this.pinStates[pin].digital = value;
    // notify generic event stream
    this.eventEmitter.emit({ type: "pin-change", pin, value, pinType: "digital" });
    // NEW: notify direct listeners
    const listeners = this.digitalWriteListeners[pin];
    if (listeners) for (const cb of listeners) cb(value);
  }
  
  private pyodide: PyodideInterface;
  private eventEmitter = new MicrobitEventEmitter();
  private ledMatrix: boolean[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(false)
  );
  private pinStates: Record<string, { digital: number; analog: number }> = {};
  private buttonStates: Record<"A" | "B", boolean> = { A: false, B: false };
  private inputHandlers: Record<"A" | "B", any[]> = { A: [], B: [] };
  private foreverCallbacks: Set<any> = new Set();

  public readonly Button = {
    A: new ButtonInstance("A"),
    B: new ButtonInstance("B"),
  };

  public readonly DigitalPin: Record<string, string> = {};
  
  public readonly led = {
    plot: this.plot.bind(this),
    unplot: this.unplot.bind(this),
    point: this.point.bind(this),
    toggle: this.toggle.bind(this),
  };
  public readonly input = {
    on_button_pressed: this.onButtonPressed.bind(this),
    _clear: this.clearInputs.bind(this),
  };
  public readonly basic = {
    show_string: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
  };

  constructor(pyodide: PyodideInterface) {
    this.pyodide = pyodide;

    for (let i = 0; i <= 20; i++) {
      const pin = `P${i}`;
      this.pinStates[pin] = { digital: 0, analog: 0 };
      this.DigitalPin[pin] = pin;
    }
  }

  subscribe(callback: MicrobitEventCallback) {
    return this.eventEmitter.subscribe(callback);
  }

  private async showString(
    text: string,
    interval: number = 150
  ): Promise<void> {
    const validChars = text
      .split("")
      .filter((char) => CHARACTER_PATTERNS[char]);

    if (validChars.length === 0) {
      this.clearDisplay();
      return;
    }

    const scrollPattern: boolean[][] = [];

    validChars.forEach((char, index) => {
      const pattern = CHARACTER_PATTERNS[char];
      pattern.forEach((row, rowIndex) => {
        if (!scrollPattern[rowIndex]) {
          scrollPattern[rowIndex] = [];
        }
        scrollPattern[rowIndex].push(...row.map((v) => Boolean(v)));
        if (index < validChars.length - 1) {
          scrollPattern[rowIndex].push(false);
        }
      });
    });

    for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
      for (let i = 0; i < 5; i++) {
        scrollPattern[rowIndex].push(false);
      }
    }

    let currentOffset = 0;
    const maxOffset = scrollPattern[0].length;

    while (currentOffset < maxOffset) {
      this.clearDisplay();

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const patternCol = currentOffset + col;
          if (
            patternCol < scrollPattern[row].length &&
            scrollPattern[row][patternCol]
          ) {
            this.plot(col, row);
          }
        }
      }

      currentOffset++;
      if (currentOffset < maxOffset) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    this.clearDisplay();
  }

  private forever(callback: () => void) {
    const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
    this.foreverCallbacks.add(proxy);
    this.startIndividualForeverLoop(proxy);
  }

  private startIndividualForeverLoop(callback: any) {
    const runCallback = async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Error in forever loop:", error);
      }
      setTimeout(runCallback, 20);
    };
    setTimeout(runCallback, 20);
  }

  private async pause(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private clearDisplay() {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.unplot(x, y);
      }
    }
  }

  reset() {
    this.foreverCallbacks.forEach((callback) => {
      if (callback.destroy) {
        callback.destroy();
      }
    });
    this.foreverCallbacks.clear();

    for (const pin in this.pinStates) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.ledMatrix[y][x] = false;
      }
    }
    this.buttonStates = { A: false, B: false };
    this.clearInputs();
    this.eventEmitter.emit({ type: "reset" });
    console.log("Microbit state reset");
  }


  // private readDigitalPin(pin: string) {
  //   return this.pinStates[pin].digital;
  // }

  private analogWritePin(pin: string, value: number) {
    this.pinStates[pin].analog = value;
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "analog",
    });
  }

  // private readAnalogPin(pin: string) {
  //   return this.pinStates[pin].analog;
  // }

  private plot(x: number, y: number) {
    this.ledMatrix[y][x] = true;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 1 });
  }

  private unplot(x: number, y: number) {
    this.ledMatrix[y][x] = false;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 0 });
  }

  private toggle(x: number, y: number) {
    this.ledMatrix[y][x] = !this.ledMatrix[y][x];
    this.eventEmitter.emit({
      type: "led-change",
      x,
      y,
      value: this.ledMatrix[y][x] ? 1 : 0,
    });
  }

  private point(x: number, y: number) {
    return this.ledMatrix[y][x];
  }

  private onButtonPressed(button: ButtonInstance, handler: () => void) {
    const buttonName = button.getName();
    const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(handler);
    this.inputHandlers[buttonName].push(proxy);
  }

  public pressButton(button: ButtonInstance | "A" | "B") {
    const buttonName = typeof button === "string" ? button : button.getName();
    this.buttonStates[buttonName] = true;
    this.inputHandlers[buttonName].forEach((h) => h());
    this.eventEmitter.emit({ type: "button-press", button: buttonName });
  }

  private clearInputs() {
    this.inputHandlers.A.forEach((p) => p.destroy?.());
    this.inputHandlers.B.forEach((p) => p.destroy?.());
    this.inputHandlers = { A: [], B: [] };
  }

  getStateSnapshot() {
    return {
      pins: { ...this.pinStates },
      leds: this.ledMatrix.map((row) => [...row]),
      buttons: { ...this.buttonStates },
    };
  }

   // Add ultrasonic sensor support
  public readonly ultrasonic = {
    distance_cm: this.getDistanceCm.bind(this),
  };

  private async getDistanceCm(trigPin: string, echoPin: string): Promise<number> {
  console.log(`[Ultrasonic] Measuring distance on pins ${trigPin} (trig) -> ${echoPin} (echo)`);
  
  // Step 1: Send 10µs HIGH pulse to trigger pin
  this.digitalWritePin(trigPin, 1);
  await new Promise(resolve => setTimeout(resolve, 0.01)); // 10µs
  this.digitalWritePin(trigPin, 0);
  
  // Step 2: Wait for echo pin to go HIGH
  const startTime = performance.now();
  const maxWaitTime = 30; // 30ms timeout
  
  // Wait for echo to go HIGH
  while (this.readDigitalPin(echoPin) === 0) {
    if (performance.now() - startTime > maxWaitTime) {
      console.log(`[Ultrasonic] Timeout waiting for echo HIGH on pin ${echoPin}`);
      return -1; // Timeout
    }
    await new Promise(resolve => setTimeout(resolve, 0.1));
  }
  
  const echoStartTime = performance.now();
  console.log(`[Ultrasonic] Echo started at ${echoStartTime}`);
  
  // Wait for echo to go LOW
  while (this.readDigitalPin(echoPin) === 1) {
    if (performance.now() - echoStartTime > maxWaitTime) {
      console.log(`[Ultrasonic] Timeout waiting for echo LOW on pin ${echoPin}`);
      return -1; // Timeout
    }
    await new Promise(resolve => setTimeout(resolve, 0.1));
  }
  
  const echoEndTime = performance.now();
  const pulseDuration = (echoEndTime - echoStartTime) * 1000; // Convert to microseconds
  
  console.log(`[Ultrasonic] Echo ended at ${echoEndTime}, duration: ${pulseDuration}µs`);
  
  // Calculate distance: duration(µs) * 0.0343 cm/µs / 2
  const distanceCm = (pulseDuration * 0.0343) / 2;
  
  console.log(`[Ultrasonic] Calculated distance: ${distanceCm}cm`);
  
  return Math.round(distanceCm * 10) / 10; // Round to 1 decimal place
}


  getPythonModule() {
  console.log("[MicrobitSimulator] Creating Python module with ultrasonic support");
  return {
    pins: this.pins,
    led: this.led,
    input: this.input,
    Button: this.Button,
    DigitalPin: this.DigitalPin,
    basic: this.basic,
    ultrasonic: this.ultrasonic, 
  };
  }
}
