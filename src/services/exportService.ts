/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Issue, UserProfile, ActivityLog } from "../types";

/**
 * Converts array of objects to CSV format with UTF-8 BOM encoding for Excel compatibility
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  const keys = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(","));

  // Data rows
  for (const row of data) {
    const values = keys.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      if (typeof val === "object") {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvString = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data formatted for Excel (.xls / .csv with tab delimiters)
 */
export function exportToExcel(data: any[], filename: string) {
  exportToCSV(data, `${filename}_excel`);
}

/**
 * Generates and triggers print/save as PDF report layout
 */
export function exportToPDF(
  title: string,
  summaryCards: { label: string; value: string | number }[],
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate PDF exports.");
    return;
  }

  const dateStr = new Date().toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 30px;
            color: #1e293b;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }
          .brand {
            font-size: 24px;
            font-weight: 900;
            color: #1e40af;
          }
          .subtitle {
            font-size: 13px;
            color: #64748b;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px 16px;
            border-radius: 8px;
          }
          .card-title {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .card-val {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 12px;
          }
          th {
            background-color: #2563eb;
            color: white;
            text-align: left;
            padding: 10px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CivicTrack Enterprise</div>
            <div class="subtitle">${title}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Generated: ${dateStr}</div>
            <div>Official Executive Report</div>
          </div>
        </div>

        ${
          summaryCards && summaryCards.length > 0
            ? `<div class="summary-grid">
                ${summaryCards
                  .map(
                    c => `
                  <div class="card">
                    <div class="card-title">${c.label}</div>
                    <div class="card-val">${c.value}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }

        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                r => `
              <tr>
                ${r.map(val => `<td>${val ?? ""}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          CivicTrack Enterprise Admin System • Confidential Administrative Document
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Format Issue list for CSV export
 */
export function formatIssuesForExport(issues: Issue[]) {
  return issues.map(i => ({
    "Issue ID": i.id,
    "Title": i.title,
    "Category": i.category,
    "Severity": i.severity,
    "Status": i.status.toUpperCase(),
    "Reporter Name": i.reporterName,
    "Reporter Email": i.reporterEmail || "N/A",
    "Latitude": i.lat,
    "Longitude": i.lng,
    "Upvotes": i.upvoteCount,
    "AI Category": i.aiCategory || "N/A",
    "AI Severity": i.aiSeverity || "N/A",
    "Created Date": i.createdAt?.seconds
      ? new Date(i.createdAt.seconds * 1000).toLocaleString()
      : new Date().toLocaleString(),
    "Description": i.description,
  }));
}

/**
 * Format User list for CSV export
 */
export function formatUsersForExport(users: UserProfile[]) {
  return users.map(u => ({
    "User ID": u.uid,
    "Name": u.name,
    "Email": u.email || "N/A",
    "Role": u.role.toUpperCase(),
    "Status": u.status.toUpperCase(),
    "Points": u.points,
    "Badges": u.badges.join(", "),
    "Created At": u.createdAt?.seconds
      ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
      : "N/A",
    "Last Login": u.lastLogin?.seconds
      ? new Date(u.lastLogin.seconds * 1000).toLocaleString()
      : "N/A",
  }));
}
