"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

interface Section {
  id: string;
  title: string;
}

const SECTIONS: Section[] = [
  { id: "getting-started", title: "Getting Started" },
  { id: "compose", title: "Compose" },
  { id: "editor", title: "Editor" },
  { id: "sounds", title: "Sounds" },
  { id: "perform", title: "Perform" },
  { id: "sessions", title: "Sessions" },
  { id: "device", title: "Device" },
  { id: "projects", title: "Projects" },
  { id: "settings", title: "Settings" },
  { id: "keyboard-shortcuts", title: "Keyboard Shortcuts" },
  { id: "channel-reference", title: "Channel Reference" },
];

// ---------------------------------------------------------------------------
// Inline components
// ---------------------------------------------------------------------------

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono bg-muted text-foreground/90 rounded px-1.5 py-0.5 text-xs">
      {children}
    </code>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="text-xl font-semibold text-foreground pt-8 pb-3 border-b border-border scroll-mt-6"
    >
      {title}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Table of Contents (sticky sidebar)
// ---------------------------------------------------------------------------

function TableOfContents({
  activeId,
  onClickLink,
}: {
  activeId: string;
  onClickLink: (id: string) => void;
}) {
  return (
    <nav className="w-56 shrink-0 sticky top-6 self-start hidden lg:block">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Contents
      </h3>
      <ul className="flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => onClickLink(s.id)}
              className={cn(
                "text-left text-sm w-full rounded px-2.5 py-1.5 transition-colors",
                activeId === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  // ---- IntersectionObserver scrollspy ----
  useEffect(() => {
    const headings = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="flex gap-8 max-w-5xl mx-auto px-6 py-6 h-full overflow-y-auto">
      <TableOfContents activeId={activeId} onClickLink={scrollTo} />

      <div ref={contentRef} className="flex-1 min-w-0 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          User Manual
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Reference guide for SeqTrack Composer. Covers every feature from
          connecting your SEQTRAK to AI-powered composition.
        </p>

        {/* ---- 1. Getting Started ---- */}
        <SectionHeading id="getting-started" title="Getting Started" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            <strong className="text-foreground">Connect your SEQTRAK:</strong>{" "}
            Plug the SEQTRAK into your computer via USB and power it on. Open
            the <strong className="text-foreground">Device</strong> page from
            the sidebar. The app auto-detects the device when Web MIDI access is
            granted. Use Chrome or Edge for full MIDI support.
          </p>
          <p>
            <strong className="text-foreground">First composition:</strong>{" "}
            Navigate to <strong className="text-foreground">Compose</strong>,
            type a short description of the music you want (e.g. &quot;lo-fi hip
            hop beat, 85 BPM, mellow&quot;), and click{" "}
            <strong className="text-foreground">Generate</strong>. Preview the
            result, then click{" "}
            <strong className="text-foreground">Apply to Editor</strong> to load
            the pattern into the step sequencer. Press{" "}
            <strong className="text-foreground">Play</strong> in the transport
            bar to hear it on the SEQTRAK.
          </p>
          <p>
            <strong className="text-foreground">Navigation:</strong> The sidebar
            on the left provides access to all pages: Compose, Editor, Sounds,
            Perform, Sessions, Device, Projects, and Settings. The transport bar
            at the bottom controls playback (Record, Play, Stop) and shows the
            current BPM and project name.
          </p>
        </div>

        {/* ---- 2. Compose ---- */}
        <SectionHeading id="compose" title="Compose" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Write a natural-language prompt describing the music you want. Be
            specific: mention genre, tempo, instruments, mood, and any stylistic
            details. Example: &quot;aggressive techno, 138 BPM, heavy kick,
            rolling hi-hats, acid bassline.&quot;
          </p>
          <p>
            <strong className="text-foreground">Presets:</strong> Use the preset
            categories to start from a template instead of a blank prompt. Categories
            include Full Beats, Full Production, World, Classics, Atmospheric,
            Melodic, Drums Only, and Bass Only. Selecting a preset populates the
            prompt field with a starting point you can further refine.
          </p>
          <p>
            <strong className="text-foreground">Enhance Prompt:</strong> Click
            the Enhance button to let the AI expand your brief description into
            a more detailed prompt before generation. This often produces better
            results from short inputs.
          </p>
          <p>
            <strong className="text-foreground">Refining and history:</strong>{" "}
            After generation, modify your prompt and generate again to iterate.
            Previous results are stored in the generation history panel so you
            can revisit or compare earlier outputs. The model provider dropdown
            lets you choose between configured LLM providers.
          </p>
        </div>

        {/* ---- 3. Editor ---- */}
        <SectionHeading id="editor" title="Editor" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            The step grid displays 16 steps per bar (16th notes). Click any cell
            to toggle a note on or off. The grid spans all 11 SEQTRAK channels
            as rows.
          </p>
          <p>
            <strong className="text-foreground">Drum tracks</strong> (channels
            1-7) use a fixed pitch of 60 (C3). Each row is a single instrument
            (Kick, Snare, Clap, Hat1, Hat2, Perc1, Perc2).{" "}
            <strong className="text-foreground">Melodic tracks</strong>{" "}
            (channels 8-11) expand into a piano-roll view where you can place
            notes at different pitches within the selected scale.
          </p>
          <p>
            <strong className="text-foreground">Sound picker:</strong> Click a
            track name to open the sound picker and browse presets for that
            channel. Harmony hints appear on hover to suggest musically
            compatible notes.
          </p>
          <p>
            <strong className="text-foreground">Controls:</strong> Each track
            has a volume slider and mute button. The genre preset toolbar above
            the grid applies common rhythm patterns. Use the Import dialog to
            load patterns from MIDI files, sheet music, drum tabs, bass tabs, or
            plain-text notes. Export the current project as a{" "}
            <Code>.mid</Code> file. The AI Enhance button sends the current
            pattern back to the AI for intelligent refinement.
          </p>
        </div>

        {/* ---- 4. Sounds ---- */}
        <SectionHeading id="sounds" title="Sounds" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Browse 2032+ built-in presets organized by sound engine: Drum, Synth
            (AWM2), DX (FM synthesis), and Sampler. Filter by category or search
            by name. Selecting a preset sends the full program-change sequence
            to the SEQTRAK:{" "}
            <Code>CC0</Code> (Bank MSB), <Code>CC32</Code> (Bank LSB),{" "}
            <Code>Program Change</Code>, then <Code>CC32</Code> again. The
            final CC32 re-send is required by the SEQTRAK hardware.
          </p>
          <p>
            <strong className="text-foreground">Scan Device:</strong> If you
            have custom or user-edited preset names on the SEQTRAK, use Scan
            Device to read the actual names via SysEx. This updates the local
            library to match what is on the hardware.
          </p>
          <p>
            <strong className="text-foreground">CC parameter control:</strong>{" "}
            Each sound exposes knob parameters via MIDI CC: vibrato, reverb
            send, resonance, filter cutoff, and more. The parameter list adapts
            to the channel type (drum channels expose different CCs than synth
            channels).
          </p>
        </div>

        {/* ---- 5. Perform ---- */}
        <SectionHeading id="perform" title="Perform" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Perform mode uses MediaPipe hand tracking through your webcam to
            control SEQTRAK parameters in real time. Grant camera access when
            prompted.
          </p>
          <p>
            <strong className="text-foreground">Gesture mapping:</strong> Create
            mappings that bind hand movements (left hand, right hand, or both)
            to any CC parameter. For example, map vertical position of your left
            hand to filter cutoff, or horizontal spread of both hands to reverb
            send.
          </p>
          <p>
            <strong className="text-foreground">Real-time FX:</strong> As you
            move your hands, CC values are sent continuously to the connected
            SEQTRAK. The Reset FX button restores all mapped parameters to their
            default values. A connected SEQTRAK is required for Perform mode to
            send any data.
          </p>
        </div>

        {/* ---- 6. Sessions ---- */}
        <SectionHeading id="sessions" title="Sessions" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Record live sessions using the Record button in the transport bar.
            Audio is captured from the system input (or SEQTRAK audio if routed
            via USB audio).
          </p>
          <p>
            <strong className="text-foreground">Browse recordings:</strong> The
            Sessions page lists all saved recordings with timestamps and
            durations. Click any recording to open it.
          </p>
          <p>
            <strong className="text-foreground">Timeline editor:</strong> View
            the waveform display, trim start and end points, and mark regions.
            Convert a recording (or a selected region) into step-sequencer
            patterns using AI transcription, which analyzes the audio and
            generates a matching pattern in the editor.
          </p>
        </div>

        {/* ---- 7. Device ---- */}
        <SectionHeading id="device" title="Device" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            The Device page shows the connection status of your SEQTRAK. When
            plugged in via USB and powered on, the device is auto-detected. The
            page displays the device name and connection state.
          </p>
          <p>
            <strong className="text-foreground">Testing:</strong> Use{" "}
            <strong className="text-foreground">Test All Channels</strong> to
            send a note on every channel (1-11) to verify the connection. You
            can also test individual channels one at a time.
          </p>
          <p>
            <strong className="text-foreground">Troubleshooting:</strong> If the
            device is not detected, verify you are using Chrome or Edge (Firefox
            and Safari do not support Web MIDI). Check the USB cable connection.
            Power-cycle the SEQTRAK (turn off, wait a few seconds, turn back
            on). Refresh the page after reconnecting. Ensure no other
            application has exclusive MIDI access to the device.
          </p>
        </div>

        {/* ---- 8. Projects ---- */}
        <SectionHeading id="projects" title="Projects" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Projects are stored in localStorage. The Projects page lists all
            saved projects with their name, BPM, key, and last-modified date.
          </p>
          <p>
            <strong className="text-foreground">Save and load:</strong> The
            current project is auto-saved as you work. Create new projects or
            switch between existing ones from this page.
          </p>
          <p>
            <strong className="text-foreground">Export:</strong> Export the
            current project as a <Code>.mid</Code> file (Standard MIDI File
            compatible with any DAW) or as a <Code>.json</Code> file (full
            project backup including all patterns, sound assignments, and
            settings). Import projects from previously exported JSON files to
            restore a full project state.
          </p>
        </div>

        {/* ---- 9. Settings ---- */}
        <SectionHeading id="settings" title="Settings" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            Configure LLM providers for AI composition. Five providers are
            supported:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Claude</strong> -- API key
              from{" "}
              <span className="text-primary">console.anthropic.com</span>
            </li>
            <li>
              <strong className="text-foreground">Gemini</strong> -- API key
              from <span className="text-primary">ai.google.dev</span>
            </li>
            <li>
              <strong className="text-foreground">OpenRouter</strong> -- API key
              from <span className="text-primary">openrouter.ai</span>
            </li>
            <li>
              <strong className="text-foreground">LM Studio</strong> -- Local
              inference. URL defaults to{" "}
              <Code>localhost:1234</Code>. Free, no API key needed.
            </li>
            <li>
              <strong className="text-foreground">Ollama</strong> -- Local
              inference. URL defaults to{" "}
              <Code>localhost:11434</Code>. Free, install from{" "}
              <span className="text-primary">ollama.com</span>.
            </li>
          </ul>
          <p>
            <strong className="text-foreground">Docling</strong> (PDF import):
            For importing sheet music from PDFs, install the Docling server
            locally:{" "}
            <Code>pip install docling-serve &amp;&amp; docling-serve run</Code>.
          </p>
          <p>
            <strong className="text-foreground">Composition defaults:</strong>{" "}
            Set default BPM, key, scale, number of bars, and swing amount. These
            are used as initial values when creating new compositions.
          </p>
          <p>
            <strong className="text-foreground">Data management:</strong> Export
            or import your full settings as JSON. Clear all data to reset the
            app. Settings persist to{" "}
            <Code>~/Library/Preferences/</Code> and survive uninstall.
          </p>
        </div>

        {/* ---- 10. Keyboard Shortcuts ---- */}
        <SectionHeading id="keyboard-shortcuts" title="Keyboard Shortcuts" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-md overflow-hidden">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Shortcut
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Action
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-3 py-2">
                    <Code>Cmd + Enter</Code>
                  </td>
                  <td className="px-3 py-2">Generate / Refine</td>
                  <td className="px-3 py-2">Compose page</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-3 py-2">
                    <Code>Escape</Code>
                  </td>
                  <td className="px-3 py-2">Close dialog or picker</td>
                  <td className="px-3 py-2">Any open dialog</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    <Code>Space</Code>
                  </td>
                  <td className="px-3 py-2">Play / Stop</td>
                  <td className="px-3 py-2">Transport bar focused</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- 11. SEQTRAK Channel Reference ---- */}
        <SectionHeading id="channel-reference" title="SEQTRAK Channel Reference" />
        <div className="prose-sm text-muted-foreground space-y-3">
          <p>
            The SEQTRAK uses a fixed channel layout. This is not General MIDI --
            each drum instrument has its own dedicated channel rather than all
            drums sharing channel 10.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-md overflow-hidden">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Channel
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Track Name
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Type
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Engine
                  </th>
                  <th className="text-left px-3 py-2 text-foreground font-medium border-b border-border">
                    Default Pitch
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { ch: 1, name: "Kick", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 2, name: "Snare", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 3, name: "Clap", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 4, name: "Hat 1", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 5, name: "Hat 2", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 6, name: "Perc 1", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 7, name: "Perc 2", type: "Drum", engine: "Drum", pitch: 60 },
                  { ch: 8, name: "Synth 1", type: "Melodic", engine: "AWM2", pitch: "varies" },
                  { ch: 9, name: "Synth 2", type: "Melodic", engine: "AWM2", pitch: "varies" },
                  { ch: 10, name: "DX", type: "Melodic", engine: "FM (DX)", pitch: "varies" },
                  { ch: 11, name: "Sampler", type: "Melodic", engine: "Sampler", pitch: "varies" },
                ].map((row) => (
                  <tr key={row.ch} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.ch}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{row.engine}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.pitch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Drum tracks always trigger at pitch 60 (C3). Melodic tracks use real
            MIDI note numbers determined by the selected key and scale. The step
            sequencer accommodates 16 steps per bar (16th-note resolution) with
            support for 1-8 bars per pattern.
          </p>
        </div>
      </div>
    </div>
  );
}
