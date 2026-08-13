/** Indian-friendly currency formatting (SW blueprint style). */

export function formatInr(n: number, opts?: { forceFull?: boolean }): string {
  if (!Number.isFinite(n)) return "₹—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (!opts?.forceFull) {
    if (abs >= 10_000_000) {
      return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
    }
    if (abs >= 100_000) {
      return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
    }
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
