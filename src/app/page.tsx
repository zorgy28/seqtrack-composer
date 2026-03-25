import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-8 overflow-hidden">
      {/* Background SEQTRAK image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] blur-[2px] pointer-events-none"
        style={{ backgroundImage: "url('/seqtrak-hero.jpg')" }}
      />

      {/* Orange diagonal gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        {/* Orange accent lines */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-primary/50" />
          <span className="seqtrak-section-label text-primary">YAMAHA</span>
          <div className="h-px w-16 bg-primary/50" />
        </div>

        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          AI-powered music generator for the Yamaha SEQTRAK
        </p>
      </div>

      {/* Navigation cards — styled as step pads */}
      <div className="relative z-10 grid grid-cols-2 gap-4 max-w-md w-full">
        {[
          { href: "/compose", icon: "AI", label: "Compose", desc: "AI generation" },
          { href: "/editor", icon: "[]", label: "Editor", desc: "Step sequencer" },
          { href: "/sounds", icon: "~*", label: "Sounds", desc: "Browse presets" },
          { href: "/device", icon: "->", label: "Device", desc: "MIDI connection" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-6
                       bg-card/80 backdrop-blur-sm seqtrak-pad
                       hover:border-primary/40 hover:bg-card transition-all group"
          >
            <span className="text-2xl font-mono text-primary group-hover:drop-shadow-[0_0_6px_var(--seqtrak-orange-glow)]">
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
