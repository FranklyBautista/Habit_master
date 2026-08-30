"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "./button";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__status">
        <Check size={16} />
      </span>
      <span>{message}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        <X size={17} />
      </Button>
    </div>
  );
}
