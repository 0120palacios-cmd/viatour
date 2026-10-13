// Line-item arithmetic shared by quotations, reservations and invoices. Amounts are exact: quantity and
// unit price have at most two decimals, so both become integer hundredths and the product is rounded to
// cents half away from zero, exactly like PostgreSQL round(cantidad * precio_unitario, 2) in
// public.replace_quotation_items (floating-point multiplication was off by a cent at half-cent
// boundaries). A line typed "Descuento" subtracts: discounts are stored as positive amounts because every
// items table only accepts prices >= 0.

export type MoneyLine = { tipo: string; cantidad: number; precio_unitario: number };

export function isDiscount(tipo: string) {
  return tipo.trim().toLowerCase() === "descuento";
}

function hundredths(value: number) {
  return Math.round(Number(value || 0) * 100);
}

export function lineCents(line: MoneyLine) {
  const product = hundredths(line.cantidad) * hundredths(line.precio_unitario); // in 1/10000
  const cents = Math.sign(product) * Math.floor((Math.abs(product) + 50) / 100);
  return isDiscount(line.tipo) ? -cents : cents;
}

export function lineAmount(line: MoneyLine) {
  return lineCents(line) / 100;
}

export function totalAmount(lines: MoneyLine[]) {
  return lines.reduce((sum, line) => sum + lineCents(line), 0) / 100;
}
