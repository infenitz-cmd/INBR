/* ══════════════════════════════════════════
   reports.js — Attendance Reports & CSV Export
   Baskin Robbins IMS
══════════════════════════════════════════ */

const Reports = {
    init() {
        this._populateYears();
        this._setCurrentMonth();
        document.getElementById('apply-report-btn')?.addEventListener('click', () => this.generate());
        document.getElementById('export-csv-btn')?.addEventListener('click', () => this.exportCSV());
        this.generate();
    },

    _populateYears() {
        const sel = document.getElementById('report-year');
        const year = new Date().getFullYear();
        for (let y = year; y >= 2023; y--) {
            const opt = document.createElement('option');
            opt.value = y; opt.textContent = y;
            sel.appendChild(opt);
        }
    },

    _setCurrentMonth() {
        const now = new Date();
        const monthSel = document.getElementById('report-month');
        if (monthSel) monthSel.value = now.getMonth() + 1;
    },

    _getFilters() {
        return {
            year: parseInt(document.getElementById('report-year')?.value),
            month: parseInt(document.getElementById('report-month')?.value),
        };
    },

    /* aggregate attendance for selected month */
    _aggregate(year, month) {
        const logs = DB.getAttendance().filter(log => {
            const d = new Date(log.clockIn);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        const map = {}; // username → { displayName, totalMs, sessionsCount }
        logs.forEach(log => {
            if (!map[log.username]) {
                map[log.username] = { username: log.username, displayName: log.displayName, totalMs: 0, sessionsCount: 0 };
            }
            if (log.clockOut) {
                map[log.username].totalMs += (log.clockOut - log.clockIn);
                map[log.username].sessionsCount++;
            }
        });

        return Object.values(map);
    },

    generate() {
        const { year, month } = this._getFilters();
        const rows = this._aggregate(year, month);

        const tbody = document.getElementById('report-tbody');
        const empty = document.getElementById('report-empty');

        if (rows.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            ['r-items', 'r-added', 'r-sold', 'r-net'].forEach(id => UI.setStatValue(id, '0'));
            return;
        }
        empty.classList.add('hidden');

        let totalHours = 0;
        rows.forEach(r => { totalHours += (r.totalMs / 3600000); });

        UI.setStatValue('r-items', rows.length); // Total Staff
        UI.setStatValue('r-added', rows.reduce((s, r) => s + r.sessionsCount, 0)); // Total Sessions
        UI.setStatValue('r-sold', totalHours.toFixed(1)); // Total Hours
        UI.setStatValue('r-net', (totalHours / (rows.length || 1)).toFixed(1)); // Avg Hours/Staff

        tbody.innerHTML = rows.map(r => {
            const hours = (r.totalMs / 3600000).toFixed(1);
            return `
        <tr>
          <td><strong>${this._esc(r.displayName)}</strong><br><small>${this._esc(r.username)}</small></td>
          <td>${r.sessionsCount} sessions</td>
          <td style="color:var(--primary);font-weight:700;">${hours} hrs</td>
          <td colspan="3"></td>
        </tr>`;
        }).join('');
    },

    exportCSV() {
        const { year, month } = this._getFilters();
        const rows = this._aggregate(year, month);
        const inventory = DB.getInventory();
        const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });

        if (rows.length === 0) { UI.toast('No data to export for selected period.', 'warning'); return; }

        let totalAdded = 0, totalSold = 0;
        rows.forEach(r => { totalAdded += r.added; totalSold += r.sold; });

        const header = ['Item Name', 'Category', 'Qty Added', 'Qty Sold', 'Net Change', 'Current Stock'];
        const dataRows = rows.map(r => {
            const item = inventory.find(i => i.id === r.itemId);
            const stock = item ? item.quantity : '';
            const net = r.added - r.sold;
            return [r.itemName, r.category, r.added, r.sold, (net >= 0 ? '+' : '') + net, stock];
        });

        const summaryRows = [
            [],
            ['SUMMARY'],
            ['Total Items', rows.length],
            ['Total Added', totalAdded],
            ['Total Sold', totalSold],
            ['Net Change', totalAdded - totalSold],
            ['Report Period', `${monthName} ${year}`],
            ['Generated On', new Date().toLocaleString('en-IN')],
        ];

        const csvContent = [header, ...dataRows, ...summaryRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Transaction_Report_${monthName}_${year}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('CSV exported successfully!', 'success');
    },

    _esc(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
};
