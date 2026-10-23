"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OFFICE_SHORT } from "@/lib/config";

export function Seal({ size = 46 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="brand-seal" style={{ width: size, height: size }}>
      {ok ? <img src="/logo.jpg" alt="" onError={() => setOk(false)} /> : <span>CTA</span>}
    </span>
  );
}

const SIZES = [
  { key: "", label: "A", aria: "Normal na laki ng letra / Normal text" },
  { key: "lg", label: "A+", aria: "Mas malaking letra / Larger text" },
  { key: "xl", label: "A++", aria: "Pinakamalaking letra / Largest text" },
];

export function TextSize() {
  const [size, setSize] = useState("");
  useEffect(() => setSize(document.documentElement.dataset.size ?? ""), []);
  function pick(k: string) {
    setSize(k);
    if (k) document.documentElement.dataset.size = k;
    else delete document.documentElement.dataset.size;
    try {
      localStorage.setItem("cq_size", k);
    } catch {}
  }
  return (
    <div className="size-toggle" role="group" aria-label="Laki ng letra / Text size">
      {SIZES.map((s) => (
        <button key={s.label} aria-label={s.aria} aria-pressed={size === s.key} onClick={() => pick(s.key)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ subtitle = OFFICE_SHORT, sizes = true }: { subtitle?: string; sizes?: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="Home">
          <Seal />
          <span className="brand-text">
            <b>Cainta Queue</b>
            <small>{subtitle}</small>
          </span>
        </Link>
        {sizes && <TextSize />}
      </div>
    </header>
  );
}
