/**
 * Formats a number as Indian Rupees with the ₹ symbol.
 * Uses Indian numbering system: e.g. ₹12,34,567.89
 */
export function formatINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a number as Indian Rupees with always 2 decimal places.
 */
export function formatINRDecimal(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
