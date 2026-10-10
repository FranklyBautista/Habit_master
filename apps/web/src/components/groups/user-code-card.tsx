"use client";

import { formatUserCode } from "@habit-tracker/domain";
import { Copy, RefreshCw, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { useGroupActions, useGroups } from "@/lib/group-store";

import { ConfirmDialog } from "./confirm-dialog";

/** Código de usuario para que te inviten a grupos (ADR 0002 §1). */
export function UserCodeCard() {
  const snapshot = useGroups();
  const actions = useGroupActions();
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = snapshot.userCode ? formatUserCode(snapshot.userCode) : null;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setToast("Copiado.");
    } catch {
      setError("No se pudo copiar. Selecciona el código y cópialo a mano.");
    }
  }

  async function regenerate() {
    setBusy(true);
    const result = await actions.regenerateUserCode();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setConfirming(false);
    setToast("Tu código cambió. El anterior ya no sirve para invitarte.");
  }

  return (
    <Card className="group-card user-code-card" aria-labelledby="user-code-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Grupos</span>
          <h2 id="user-code-title">Tu código</h2>
        </div>
        <Users size={21} aria-hidden="true" />
      </div>
      <p className="group-muted">
        Compártelo con quien quiera invitarte a un grupo. Nadie puede buscarte por tu
        correo.
      </p>
      {code ? (
        <p className="user-code" data-testid="user-code">
          {code}
        </p>
      ) : snapshot.error ? (
        <p className="form-error" role="alert">
          {snapshot.error}
        </p>
      ) : (
        <p className="group-muted">Cargando tu código…</p>
      )}
      {error && !confirming ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="group-actions">
        <Button variant="secondary" onClick={() => void copy()} disabled={!code}>
          <Copy size={17} /> Copiar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={!code}
        >
          <RefreshCw size={17} /> Generar uno nuevo
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="¿Generar un código nuevo?"
        description="El código actual dejará de valer: quien lo tenga ya no podrá invitarte con él. Las invitaciones que ya recibiste siguen en tu bandeja."
        confirmLabel="Generar código nuevo"
        busy={busy}
        error={confirming ? error : null}
        onConfirm={() => void regenerate()}
        onClose={() => {
          setConfirming(false);
          setError(null);
        }}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </Card>
  );
}
