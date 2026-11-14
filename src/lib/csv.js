"use client";

// Client-side CSV export. Cells are quoted, and any value starting with
// = + - @ (or tab/CR) is prefixed with ' so spreadsheet apps don't execute
// it as a formula (CSV/formula injection).
function cell(v) {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows, columns) {
  const head = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(typeof c.value === "function" ? c.value(r) : r[c.value])).join(",")).join("\r\n");
  return `${head}\r\n${body}`;
}

export function downloadCsv(filename, rows, columns) {
  // BOM so Excel opens UTF-8 (Bangla names, ৳) correctly.
  const blob = new Blob(["﻿" + toCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
