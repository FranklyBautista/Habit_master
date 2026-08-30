"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  type LucideIcon,
  Menu,
  MoreHorizontal,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";

const navigation: Array<{
  href: string;
  label: string;
  shortLabel?: string;
  Icon: LucideIcon;
}> = [
  { href: "/hoy", label: "Hoy", Icon: CheckCircle2 },
  { href: "/habitos", label: "Hábitos", Icon: ListChecks },
  { href: "/calendario", label: "Calendario", shortLabel: "Cal.", Icon: CalendarDays },
  { href: "/estadisticas", label: "Estadísticas", shortLabel: "Est.", Icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", Icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="brand">
          <span className="brand-mark">
            <CheckCircle2 size={23} />
          </span>
          <span>Constancia</span>
          <Button
            variant="ghost"
            size="icon"
            className="sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={21} />
          </Button>
        </div>
        <nav>
          {navigation.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="profile-chip">
          <span className="avatar avatar--small">A</span>
          <span>
            <strong>Alex</strong>
            <small>alex@example.com</small>
          </span>
          <MoreHorizontal size={18} aria-hidden="true" />
        </div>
      </aside>
      {menuOpen ? (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      ) : null}
      <div className="main-column">
        <div className="mobile-header">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </Button>
          <span className="mobile-brand">
            <CheckCircle2 size={20} /> Constancia
          </span>
          <span className="avatar avatar--small">A</span>
        </div>
        <main id="contenido" className="main-content">
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navigation.map(({ href, label, shortLabel, Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{shortLabel ?? label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
