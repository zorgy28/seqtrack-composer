"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/compose", label: "Compose", icon: "AI" },
  { href: "/editor", label: "Editor", icon: "[]" },
  { href: "/sounds", label: "Sounds", icon: "~*" },
  { href: "/device", label: "Device", icon: "->" },
  { href: "/projects", label: "Projects", icon: "/." },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2 w-48 border-r border-border shrink-0">
      <Link
        href="/"
        className="font-bold text-sm px-3 py-2 mb-2 tracking-tight"
      >
        SeqTrack
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <span className="font-mono text-xs w-6">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
