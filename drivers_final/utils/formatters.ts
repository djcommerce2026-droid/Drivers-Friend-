export const formatCurrency = (value: number | undefined | null | string): string => {
  if (value === undefined || value === null || value === '') return '0,00';
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatOdometer = (value: number | undefined | null | string): string => {
  if (value === undefined || value === null || value === '') return '000000';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '000000';
  return Math.floor(num).toString().padStart(6, '0');
};

export const formatKm = (value: number | undefined | null | string): string => {
  if (value === undefined || value === null || value === '') return '0.0';
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num)) return '0.0';
  return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

export const formatPercent = (value: number | undefined | null | string): string => {
  if (value === undefined || value === null || value === '') return '0%';
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num)) return '0%';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + '%';
};
