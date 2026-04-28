/**
 * Format a number as Vietnamese currency: 1.500.000đ
 */
export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('vi-VN') + 'đ';

/**
 * Format a date as Vietnamese locale string
 */
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '—';

/**
 * Format a datetime as Vietnamese locale string
 */
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('vi-VN') : '—';
