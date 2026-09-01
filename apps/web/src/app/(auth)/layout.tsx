import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <CheckCircle2 size={23} />
          </span>
          <span>Constancia</span>
        </div>
        {children}
      </section>
    </main>
  );
}
