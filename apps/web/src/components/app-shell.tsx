"use client";

import type { HabitTrackerState } from "@habit-tracker/domain";
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  type LucideIcon,
  Menu,
  MoreHorizontal,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { GroupStoreProvider, useGroups } from "@/lib/group-store";
import {
  HabitStoreProvider,
  useHabitActions,
  useHabitStore,
  useLocalDataMigration,
} from "@/lib/habit-store";

type NavigationItem = {
  href: string;
  label: string;
  shortLabel?: string;
  Icon: LucideIcon;
};

// La barra inferior móvil se queda con 5 elementos (wireframe de grupos): a
// Grupos se entra desde la barra lateral, Hoy o Ajustes.
const navigation: NavigationItem[] = [
  { href: "/hoy", label: "Hoy", Icon: Sparkles },
  { href: "/habitos", label: "Hábitos", Icon: ListChecks },
  { href: "/calendario", label: "Calendario", shortLabel: "Cal.", Icon: CalendarDays },
  { href: "/estadisticas", label: "Estadísticas", shortLabel: "Est.", Icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", Icon: Settings },
];
const groupsItem: NavigationItem = { href: "/grupos", label: "Grupos", Icon: Users };
const sidebarNavigation: NavigationItem[] = [
  ...navigation.slice(0, -1),
  groupsItem,
  ...navigation.slice(-1),
];

function isActive(pathname: string, href: string) {
  return href === "/grupos" ? pathname.startsWith("/grupos") : pathname === href;
}

type AppShellProps = {
  children: ReactNode;
  initialState: HabitTrackerState;
  userEmail: string;
  userId: string;
};

export function AppShell({ children, initialState, userEmail, userId }: AppShellProps) {
  return (
    <HabitStoreProvider initialState={initialState} userId={userId}>
      <GroupStoreProvider userId={userId}>
        <AppShellContent userEmail={userEmail}>{children}</AppShellContent>
      </GroupStoreProvider>
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
  const groups = useGroups();
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingInvitations = groups.invitations.length;

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
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={21} strokeWidth={2.4} />
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
          {sidebarNavigation.map(({ href, label, Icon }) => {
            const badge = href === "/grupos" && pendingInvitations > 0;
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                <span>{label}</span>
                {badge ? (
                  <span className="nav-badge">
                    <span aria-hidden="true">{pendingInvitations}</span>
                    <span className="sr-only">
                      {pendingInvitations === 1
                        ? ", 1 invitación pendiente"
                        : `, ${pendingInvitations} invitaciones pendientes`}
                    </span>
                  </span>
                ) : null}
              </Link>
            );
          })}
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
            <span className="brand-mark brand-mark--small" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.4} />
            </span>
            Constancia
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
        {navigation.map(({ href, label, shortLabel, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span>{shortLabel ?? label}</span>
            </Link>
          );
        })}
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
