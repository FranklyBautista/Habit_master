import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={26} strokeWidth={2.4} />
          </span>
          <span>Constancia</span>
        </div>
        {children}
      </section>
    </main>
  );
}
