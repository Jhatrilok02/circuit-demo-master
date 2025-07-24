import type { ShortcutDefinition } from "@/utils/hooks/useCircuitShortcuts";
import type { CircuitElement, Wire } from "@/common/types/circuit";

type ShortcutMetadata = Omit<ShortcutDefinition, "handler">;

type ShortcutArgs = {
  elements: CircuitElement[];
  wires: Wire[];
  selectedElement: CircuitElement | null;
  setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  setSelectedElement: React.Dispatch<
    React.SetStateAction<CircuitElement | null>
  >;
  setCreatingWireStartNode: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingWire: React.Dispatch<React.SetStateAction<any>>;
  pushToHistory: () => void;
  stopSimulation: () => void;
  resetState: () => void;
  getNodeParent: (nodeId: string) => CircuitElement | null | undefined;
  undo: () => void;
  toggleSimulation: () => void;
};

/**
 * Returns metadata about available shortcuts for display purposes (without handlers).
 */
export function getShortcutMetadata(): ShortcutMetadata[] {
  return [
    {
      name: "Cancel wire creation",
      description: "Cancel wire creation and editing",
      keys: ["escape"],
    },
    {
      name: "Reset",
      description: "Reset the entire canvas",
      keys: ["ctrl", "l"],
    },
    {
      name: "Undo",
      description: "Undo last action",
      keys: ["ctrl", "z"],
    },
    {
      name: "Delete selected",
      description: "Delete selected element and connected wires",
      keys: ["delete"],
    },
    {
      name: "Clear wires",
      description: "Delete all wires",
      keys: ["shift", "w"],
    },
    {
      name: "Start/stop simulation",
      description: "Start or stop the circuit simulation",
      keys: ["space"],
    },
  ];
}

/**
 * Returns full shortcut definitions with handler functions attached.
 */
export function getCircuitShortcuts(args: ShortcutArgs): ShortcutDefinition[] {
  const {
    elements,
    wires,
    selectedElement,
    setElements,
    setWires,
    setSelectedElement,
    setCreatingWireStartNode,
    setEditingWire,
    pushToHistory,
    stopSimulation,
    resetState,
    getNodeParent,
    undo,
    toggleSimulation,
  } = args;

  return getShortcutMetadata().map((meta) => {
    switch (meta.keys.join("+")) {
      case "escape":
        return {
          ...meta,
          handler: () => {
            setCreatingWireStartNode(null);
            setEditingWire(null);
          },
        };
      case "ctrl+l":
        return {
          ...meta,
          handler: () => resetState(),
        };
      case "ctrl+z":
        return {
          ...meta,
          handler: () => undo(),
        };
      case "delete":
        return {
          ...meta,
          handler: () => {
            if (!selectedElement) return;
            pushToHistory();
            setElements((prev) =>
              prev.filter((el) => el.id !== selectedElement.id)
            );
            setWires((prev) =>
              prev.filter(
                (w) =>
                  getNodeParent(w.fromNodeId)?.id !== selectedElement.id &&
                  getNodeParent(w.toNodeId)?.id !== selectedElement.id
              )
            );
            stopSimulation();
            setSelectedElement(null);
            setCreatingWireStartNode(null);
            setEditingWire(null);
          },
        };
      case "shift+w":
        return {
          ...meta,
          handler: () => {
            pushToHistory();
            setWires([]);
            stopSimulation();
          },
        };
      case "space":
        return {
          ...meta,
          handler: () => {
            toggleSimulation();
          },
        };
      default:
        return {
          ...meta,
          handler: () => { },
        };
    }
  });
}
