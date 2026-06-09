// Admin export utilities

export function exportToCSV(data, filename = "export") {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = [headers.join(","), ...data.map(row =>
    headers.map(h => {
      const val = row[h] ?? "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  )];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToJSON(data, filename = "export") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

export function exportToPDF(data, filename = "export", title = "Export") {
  // Simple HTML-to-print PDF
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const html = `
    <html><head><title>${title}</title>
    <style>body{font-family:sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}
    th{background:#f1f5f9;padding:6px;text-align:left;border:1px solid #e2e8f0}
    td{padding:5px 6px;border:1px solid #e2e8f0}h1{font-size:16px;margin-bottom:8px}</style>
    </head><body>
    <h1>${title}</h1><p>Generated: ${new Date().toLocaleString()}</p>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}