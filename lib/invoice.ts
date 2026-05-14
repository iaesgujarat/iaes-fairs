export function calculateInvoiceAmounts(boothPriceInr: number) {
  const base = Number(boothPriceInr);
  const gstPercent = 18;
  const gstAmount = Math.round(base * (gstPercent / 100) * 100) / 100;
  const total = Math.round((base + gstAmount) * 100) / 100;
  return {
    amount_inr: base,
    gst_percent: gstPercent,
    gst_amount_inr: gstAmount,
    total_amount_inr: total,
  };
}
