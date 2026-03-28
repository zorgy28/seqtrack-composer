"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  title: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/compose", label: "Compose", icon: "AI", title: "AI-powered pattern generation" },
  { href: "/editor", label: "Editor", icon: "[]", title: "Visual step sequencer" },
  { href: "/sounds", label: "Sounds", icon: "~*", title: "Browse and manage presets" },
  { href: "/perform", label: "Perform", icon: "##", title: "Hand tracking FX control" },
  { href: "/sessions", label: "Sessions", icon: "\u23FA", title: "Recording and playback" },
  { href: "/device", label: "Device", icon: "->", title: "MIDI connection management" },
  { href: "/projects", label: "Projects", icon: "/.", title: "Save, load, and export" },
  { href: "/settings", label: "Settings", icon: "\u2699", title: "App configuration" },
  { href: "/docs", label: "Docs", icon: "??", title: "User manual and help" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2 w-48 border-r border-border shrink-0">
      <div className="px-3 py-3 mb-2">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.title}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === item.href
              ? "bg-primary/10 text-primary border-l-2 border-primary"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <span className="font-mono text-xs w-6">{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {/* Decorative grille */}
      <div className="mt-auto px-3 py-4">
        <div className="h-10 rounded-lg seqtrak-grille opacity-15" />
      </div>
    </nav>
  );
}
