import type { MidiDevice, MidiConnectionState } from "@/lib/midi/types";
import { SEQTRAK_DEVICE_NAMES } from "@/lib/midi/constants";
import { detectDeviceProfile } from "@/lib/devices/registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webmidiInstance: any = null;

export function isWebMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

function toMidiDevice(
  port: { id: string; name: string | undefined; manufacturer: string | undefined },
): MidiDevice {
  const name = port.name ?? "Unknown";
  const detectedProfile = detectDeviceProfile(name);
  return {
    id: port.id,
    name,
    manufacturer: port.manufacturer ?? "Unknown",
    isSeqtrack: SEQTRAK_DEVICE_NAMES.some((n) =>
      name.toLowerCase().includes(n.toLowerCase()),
    ),
    detectedDeviceId: detectedProfile.id !== "generic" ? detectedProfile.id : undefined,
  };
}

export async function initMidi(): Promise<MidiConnectionState> {
  if (!isWebMidiSupported()) {
    return {
      status: "unsupported",
      device: null,
      outputs: [],
      inputs: [],
      error: "Web MIDI API is not supported in this browser. Use Chrome or Edge.",
    };
  }

  try {
    const { WebMidi } = await import("webmidi");
    await WebMidi.enable({ sysex: true });
    webmidiInstance = WebMidi;

    const outputs = WebMidi.outputs.map((o) => toMidiDevice(o));
    const inputs = WebMidi.inputs.map((i) => toMidiDevice(i));

    // Auto-detect: prefer recognized devices (SEQTRAK, MicroFreak, etc.), then any device
    const recognized = outputs.find((o) => o.detectedDeviceId) ?? null;
    const autoDevice = recognized ?? (outputs.length === 1 ? outputs[0] : null);

    return {
      status: autoDevice ? "connected" : "disconnected",
      device: autoDevice,
      outputs,
      inputs,
      error: null,
    };
  } catch (err) {
    return {
      status: "error",
      device: null,
      outputs: [],
      inputs: [],
      error: err instanceof Error ? err.message : "Failed to enable MIDI",
    };
  }
}

type PortLike = { id: string; name: string | undefined; manufacturer: string | undefined };

export function getOutputs(): MidiDevice[] {
  if (!webmidiInstance) return [];
  return webmidiInstance.outputs.map((o: PortLike) => toMidiDevice(o));
}

export function getInputs(): MidiDevice[] {
  if (!webmidiInstance) return [];
  return webmidiInstance.inputs.map((i: PortLike) => toMidiDevice(i));
}

export function getOutputPort(deviceId: string) {
  if (!webmidiInstance) return null;
  return webmidiInstance.outputs.find((o: PortLike) => o.id === deviceId) ?? null;
}

/**
 * Get the input port matching the given output device ID by name.
 * SEQTRAK has paired input/output ports with matching names.
 */
export function getInputPort(deviceId: string) {
  if (!webmidiInstance) return null;
  const output = webmidiInstance.outputs.find((o: PortLike) => o.id === deviceId);
  if (!output) return null;
  // Match by name (SEQTRAK input and output ports share the same name)
  return webmidiInstance.inputs.find(
    (i: PortLike) => i.name === output.name,
  ) ?? webmidiInstance.inputs[0] ?? null;
}

export function onDeviceChange(
  callback: (state: { outputs: MidiDevice[]; inputs: MidiDevice[] }) => void,
): () => void {
  if (!webmidiInstance) return () => {};

  const handler = () => {
    callback({
      outputs: getOutputs(),
      inputs: getInputs(),
    });
  };

  webmidiInstance.addListener("connected", handler);
  webmidiInstance.addListener("disconnected", handler);

  return () => {
    webmidiInstance?.removeListener("connected", handler);
    webmidiInstance?.removeListener("disconnected", handler);
  };
}

export function disableMidi() {
  if (webmidiInstance?.enabled) {
    webmidiInstance.disable();
    webmidiInstance = null;
  }
}
