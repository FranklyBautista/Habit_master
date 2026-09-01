"use client";

import type { HabitTrackerState } from "@habit-tracker/domain";
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
import {
  HabitStoreProvider,
  useHabitActions,
  useHabitStore,
  useLocalDataMigration,
} from "@/lib/habit-store";

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

type AppShellProps = {
  children: ReactNode;
  initialState: HabitTrackerState;
  userEmail: string;
  userId: string;
};

export function AppShell({ children, initialState, userEmail, userId }: AppShellProps) {
  return (
    <HabitStoreProvider initialState={initialState} userId={userId}>
      <AppShellContent userEmail={userEmail}>{children}</AppShellContent>
    </HabitStoreProvider>
  );
}

function AppShellContent({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const snapshot = useHabitStore();
  const actions = useHabitActions();
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
          <span className="avatar avatar--small">
            {snapshot.settings.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{snapshot.settings.displayName}</strong>
            <small>{userEmail}</small>
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
          <span className="avatar avatar--small">
            {snapshot.settings.displayName.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <main id="contenido" className="main-content" tabIndex={-1}>
          {snapshot.error ? (
            <div className="sync-error" role="alert">
              <span>{snapshot.error}</span>
              <Button variant="secondary" onClick={() => void actions.refresh()}>
                Reintentar
              </Button>
            </div>
          ) : null}
          <LocalDataMigration />
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

function LocalDataMigration() {
  const { actions, localDataAvailable } = useLocalDataMigration();
  const [message, setMessage] = useState<string | null>(null);

  if (!localDataAvailable)
    return message ? <p className="migration-message">{message}</p> : null;

  async function migrate() {
    const imported = await actions.importLocalData();
    if (imported) setMessage("Tus datos locales se importaron a la cuenta.");
  }

  function discard() {
    if (
      !window.confirm("¿Descartar definitivamente los datos locales de este navegador?")
    ) {
      return;
    }
    actions.discardLocalData();
    setMessage(
      "Los datos locales se descartaron. Tus datos sincronizados no cambiaron.",
    );
  }

  return (
    <section className="migration-banner" aria-labelledby="migration-title">
      <div>
        <strong id="migration-title">Encontramos datos locales</strong>
        <p>Impórtalos a esta cuenta o descártalos de este navegador.</p>
      </div>
      <div>
        <Button onClick={() => void migrate()}>Importar</Button>
        <Button variant="danger" onClick={discard}>
          Descartar
        </Button>
      </div>
    </section>
  );
}
