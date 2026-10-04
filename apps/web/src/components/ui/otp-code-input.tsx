"use client";

import { useState } from "react";

type OtpCodeInputProps = {
  id: string;
  name: string;
  length: number;
  value: string;
  onChange: (code: string) => void;
};

// One-digit boxes drawn under a single transparent input that covers the row,
// like apps/mobile/src/components/otp-code-input.tsx. With one input per box,
// pasting the code, the browser's `one-time-code` autofill and backspace all
// need focus juggling; a single field keeps them working as in any input, and
// screen readers announce one labelled field instead of six. No `maxLength`:
// it would cut a pasted "123 456" before the non-digits are stripped.
export function OtpCodeInput({ id, name, length, value, onChange }: OtpCodeInputProps) {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="otp-input">
      <div className="otp-cells" aria-hidden="true">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className="otp-cell"
            data-active={focused && index === activeIndex ? "" : undefined}
          >
            {value[index] ?? ""}
          </span>
        ))}
      </div>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        value={value}
        onBlur={() => setFocused(false)}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, length))
        }
        onFocus={() => setFocused(true)}
      />
    </div>
  );
}
