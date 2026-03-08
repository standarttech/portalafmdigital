/**
 * Client-safe CSV export utility for portal reports.
 */

interface ExportRow {
  [key: string]: string | number | null | undefined;
}

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateCSV(headers: string[], rows: ExportRow[], keys: string[]): string {
  const lines: string[] = [headers.map(escapeCSV).join(',')];
  for (const row of rows) {
    lines.push(keys.map(k => escapeCSV(row[k])).join(','));
  }
  return lines.join('\n');
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPerformanceSummary(
  snapshots: any[],
  period: string,
) {
  if (snapshots.length === 0) return false;

  const headers = ['Campaign', 'Platform', 'Spend', 'Clicks', 'Leads', 'Revenue', 'CTR %', 'CPC', 'Last Updated'];
  const keys = ['name', 'platform', 'spend', 'clicks', 'leads', 'revenue', 'ctr', 'cpc', 'synced_at'];

  const rows = snapshots.map(s => ({
    name: s.entity_name || 'Campaign',
    platform: s.platform || 'Meta',
    spend: Number(s.spend || 0).toFixed(2),
    clicks: s.clicks || 0,
    leads: s.leads || 0,
    revenue: Number(s.revenue || 0).toFixed(2),
    ctr: Number(s.ctr || 0).toFixed(2),
    cpc: Number(s.cpc || 0).toFixed(2),
    synced_at: s.synced_at ? new Date(s.synced_at).toLocaleDateString() : '',
  }));

  const csv = generateCSV(headers, rows, keys);
  downloadCSV(csv, `performance-report-${period || 'all-time'}.csv`);
  return true;
}
