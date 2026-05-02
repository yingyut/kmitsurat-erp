"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/customers", label: "Customers", icon: "🏢" },
  { href: "/activity", label: "Activity", icon: "📝" },
  { href: "/presale", label: "Presale", icon: "📋" },
  { href: "/quotations", label: "Quotations", icon: "💰" },
  { href: "/service", label: "Service Tickets", icon: "🔧" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-full w-56 flex-col bg-card border-r border-border">
      <div className="px-5 py-5">
        <h1 className="text-lg font-bold tracking-tight text-accent">
          KMITSURAT
        </h1>
        <p className="text-xs text-muted">Work Portal</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-accent text-white font-medium"
                  : "text-muted hover:bg-card-hover hover:text-foreground"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-muted">v0.1.0 MVP</p>
      </div>
    </aside>
  );
}
