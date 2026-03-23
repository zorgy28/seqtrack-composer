import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          SeqTrack Composer
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          AI-powered music generator for the Yamaha SEQTRAK
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md w-full">
        <Link
          href="/compose"
          className="flex flex-col items-center gap-2 rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <span className="text-2xl font-mono">AI</span>
          <span className="font-medium">Compose</span>
          <span className="text-xs text-muted-foreground">AI generation</span>
        </Link>

        <Link
          href="/editor"
          className="flex flex-col items-center gap-2 rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <span className="text-2xl font-mono">[]</span>
          <span className="font-medium">Editor</span>
          <span className="text-xs text-muted-foreground">Step sequencer</span>
        </Link>

        <Link
          href="/device"
          className="flex flex-col items-center gap-2 rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <span className="text-2xl font-mono">-&gt;</span>
          <span className="font-medium">Device</span>
          <span className="text-xs text-muted-foreground">MIDI connection</span>
        </Link>

        <Link
          href="/projects"
          className="flex flex-col items-center gap-2 rounded-lg border border-border p-6 hover:bg-accent transition-colors"
        >
          <span className="text-2xl font-mono">/.</span>
          <span className="font-medium">Projects</span>
          <span className="text-xs text-muted-foreground">Save & load</span>
        </Link>
      </div>
    </main>
  );
}
