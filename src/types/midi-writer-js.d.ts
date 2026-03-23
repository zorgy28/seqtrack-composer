declare module "midi-writer-js" {
  export class Track {
    addTrackName(name: string): void;
    setTempo(bpm: number): void;
    setTimeSignature(numerator: number, denominator: number): void;
    addEvent(event: NoteEvent | ProgramChangeEvent): void;
  }

  export class NoteEvent {
    constructor(options: {
      pitch: number[];
      velocity?: number;
      startTick?: number;
      duration?: string | number;
      channel?: number;
      wait?: string;
    });
  }

  export class ProgramChangeEvent {
    constructor(options: { instrument: number });
  }

  export class Writer {
    constructor(tracks: Track[]);
    buildFile(): Uint8Array;
    dataUri(): string;
    base64(): string;
  }
}
