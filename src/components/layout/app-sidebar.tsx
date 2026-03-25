"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const NAV_ITEMS = [
  { href: "/compose", label: "Compose", icon: "AI" },
  { href: "/editor", label: "Editor", icon: "[]" },
  { href: "/sounds", label: "Sounds", icon: "~*" },
  { href: "/perform", label: "Perform", icon: "##" },
  { href: "/device", label: "Device", icon: "->" },
  { href: "/projects", label: "Projects", icon: "/." },
  { href: "/settings", label: "Settings", icon: "\u2699" },
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
