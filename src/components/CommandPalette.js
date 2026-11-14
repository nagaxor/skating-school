"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";

// Ctrl/⌘+K quick navigation. `items` = [{ label, href?, run?, icon, group, keywords? }]
export default function CommandPalette({ open, onClose, items }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items
      .map((it) => {
        const hay = `${it.label} ${it.group} ${it.keywords || ""}`.toLowerCase();
        const score = it.label.toLowerCase().startsWith(q) ? 0 : hay.includes(q) ? 1 : 2;
        return { it, score };
      })
      .filter((x) => x.score < 2)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.it);
  }, [items, query]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const choose = (it) => {
    onClose();
    if (it.run) it.run();
    else if (it.href) router.push(it.href);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[index]) choose(results[index]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;
  return (
    <div className="fixed inset-0 z-[90] bg-ink-950/50 backdrop-blur-sm flex items-start justify-center px-4 pt-[12vh] animate-fadeIn" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl bg-white dark:bg-ink-900 rounded-2xl shadow-popover ring-1 ring-ink-900/10 dark:ring-white/10 overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-ink-100 dark:border-white/[0.06]">
          <Icon.Search width={17} height={17} className="text-ink-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent py-4 text-[15px] text-ink-900 dark:text-white placeholder:text-ink-400 outline-none"
            aria-controls="cmdk-list"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-ink-400 ring-1 ring-ink-900/10 dark:ring-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div id="cmdk-list" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <div className="py-10 text-center text-sm text-ink-500">No results for “{query}”</div>}
          {results.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const active = i === index;
            return (
              <div key={`${it.group}-${it.label}`}>
                {header && <div className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">{header}</div>}
                <button
                  data-idx={i}
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => choose(it)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${active ? "bg-ink-100 dark:bg-white/[0.06] text-ink-950 dark:text-white" : "text-ink-700 dark:text-ink-300"}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-ink-50 dark:bg-white/5 text-ink-500"}`}>
                    {it.icon ? <it.icon width={16} height={16} /> : <Icon.ArrowRight width={16} height={16} />}
                  </span>
                  <span className="flex-1 font-medium">{it.label}</span>
                  {active && <Icon.ArrowRight width={15} height={15} className="text-ink-400" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-ink-100 dark:border-white/[0.06] text-[11px] text-ink-400">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">↵</kbd> open</span>
        </div>
      </div>
    </div>
  );
}
