export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MONTH_NAMES_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agt',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const DAY_NAMES_ID = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export const DAY_NAMES_SHORT_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function parseYMD(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

export function formatEventDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr;
  const monthName = MONTH_NAMES_ID[parsed.month - 1] || '';
  return `${parsed.day} ${monthName} ${parsed.year}`;
}

export function formatEventDateShort(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr;
  const monthName = MONTH_NAMES_SHORT_ID[parsed.month - 1] || '';
  return `${parsed.day} ${monthName} ${parsed.year}`;
}
