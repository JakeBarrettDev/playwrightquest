"use client";

type Props = {
  show: boolean;
  text: string;
  x: number | string;
  y: number | string;
};

export function SpeechBubble({ show, text, x, y }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: "oklch(0.96 0.03 80)",
        color: "oklch(0.22 0.02 160)",
        padding: "11px 16px",
        borderRadius: 14,
        fontSize: 13,
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        maxWidth: 260,
        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0) scale(1)" : "translateY(6px) scale(0.95)",
        transition: "opacity 0.18s, transform 0.18s",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {text}
      <div
        style={{
          position: "absolute",
          left: 28,
          bottom: -7,
          width: 14,
          height: 14,
          background: "oklch(0.96 0.03 80)",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}
