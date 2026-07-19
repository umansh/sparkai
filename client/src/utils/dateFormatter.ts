/**
 * Utility functions to format dates in DD-MM-YYYY format across the SparkSchool UI.
 */

function parseDateInput(dateInput?: string | number | Date | null): Date | null {
  if (!dateInput || dateInput === 'N/A') return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'string') {
    // 1. Try parsing directly
    let d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;

    // 2. Try stripping underscore suffix (e.g., "2026-07-19T10:02:56.220Z_qrg7" -> "2026-07-19T10:02:56.220Z")
    if (dateInput.includes('_')) {
      const parts = dateInput.split('_');
      d = new Date(parts[0]);
      if (!isNaN(d.getTime())) return d;

      // Also check if any part is a numeric timestamp (e.g. client_sub_xxx_1784450283458)
      for (const p of parts) {
        if (/^\d{13}$/.test(p)) {
          d = new Date(Number(p));
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
  }
  return null;
}

export function formatDateDDMMYYYY(dateInput?: string | number | Date | null): string {
  const d = parseDateInput(dateInput);
  if (!d) return dateInput && dateInput !== 'N/A' ? String(dateInput).split('_')[0] : 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateTimeDDMMYYYY(dateInput?: string | number | Date | null): string {
  const d = parseDateInput(dateInput);
  if (!d) return dateInput && dateInput !== 'N/A' ? String(dateInput).split('_')[0] : 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
