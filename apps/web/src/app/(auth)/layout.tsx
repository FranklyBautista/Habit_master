export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="auth-shell">
      {/* Círculos decorativos del fondo, visibles desde tablet. */}
      <span className="auth-orb auth-orb--one" aria-hidden="true" />
      <span className="auth-orb auth-orb--two" aria-hidden="true" />
      <span className="auth-orb auth-orb--three" aria-hidden="true" />
      {children}
    </main>
  );
}
