/* ══════════════════════════════════════════
   attendance.js — Attendance Management
   Baskin Robbins IMS
   ══════════════════════════════════════════ */

const Attendance = {
    _timerInterval: null,

    init() {
        this._bindEvents();
        this.render();
        this.startClock();
    },

    _bindEvents() {
        document.getElementById('clock-in-btn')?.addEventListener('click', () => this.clockIn());
        document.getElementById('clock-out-btn')?.addEventListener('click', () => this.clockOut());
        document.getElementById('attendance-search')?.addEventListener('input', () => this.renderLogs());
        document.getElementById('attendance-filter-role')?.addEventListener('change', () => this.renderLogs());
    },

    render() {
        if (!Auth.currentUser) return;

        const isAdmin = Auth.isAdmin();
        const subtitle = document.getElementById('attendance-subtitle');
        if (subtitle) {
            subtitle.textContent = isAdmin ? 'Monitor staff attendance logs' : 'Track your work hours';
        }

        if (!isAdmin) {
            this.updateStatusUI();
        }

        this.renderLogs();
    },

    startClock() {
        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');
        if (!timeEl || !dateEl) return;

        const update = () => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
            dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        };

        update();
        if (this._timerInterval) clearInterval(this._timerInterval);
        this._timerInterval = setInterval(update, 1000);
    },

    updateStatusUI() {
        const activeLog = DB.getActiveClockIn(Auth.getUsername());
        const statusBox = document.getElementById('attendance-status-box');
        const statusText = document.getElementById('current-status-text');
        const inBtn = document.getElementById('clock-in-btn');
        const outBtn = document.getElementById('clock-out-btn');

        if (activeLog) {
            statusBox.classList.add('active');
            statusText.textContent = `Clocked In at ${new Date(activeLog.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
            inBtn.classList.add('hidden');
            outBtn.classList.remove('hidden');
        } else {
            statusBox.classList.remove('active');
            statusText.textContent = 'Not Clocked In';
            inBtn.classList.remove('hidden');
            outBtn.classList.add('hidden');
        }
    },

    clockIn() {
        const username = Auth.getUsername();
        if (DB.getActiveClockIn(username)) return;

        const log = {
            id: genId(),
            username: username,
            displayName: Auth.getName(),
            clockIn: Date.now(),
            clockOut: null,
            date: new Date().toISOString().split('T')[0]
        };

        DB.addAttendanceLog(log);
        UI.toast('Clocked in successfully!', 'success');
        this.render();
    },

    clockOut() {
        const username = Auth.getUsername();
        const activeLog = DB.getActiveClockIn(username);
        if (!activeLog) return;

        activeLog.clockOut = Date.now();
        DB.updateAttendanceLog(activeLog);
        UI.toast('Clocked out successfully!', 'info');
        this.render();
    },

    renderLogs() {
        const tbody = document.getElementById('attendance-tbody');
        const empty = document.getElementById('attendance-empty');
        if (!tbody) return;

        const isAdmin = Auth.isAdmin();
        const search = (document.getElementById('attendance-search')?.value || '').toLowerCase();

        let logs = DB.getAttendance();

        // If not admin, only show own logs
        if (!isAdmin) {
            logs = logs.filter(l => l.username === Auth.getUsername());
        } else {
            // Admin filtering
            if (search) {
                logs = logs.filter(l =>
                    l.displayName.toLowerCase().includes(search) ||
                    l.username.toLowerCase().includes(search)
                );
            }
        }

        if (logs.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        tbody.innerHTML = logs.map(log => {
            const duration = log.clockOut
                ? this._formatDuration(log.clockOut - log.clockIn)
                : 'Working...';
            const statusLabel = log.clockOut ? 'Completed' : 'Working';
            const statusCls = log.clockOut ? 'completed' : 'working';

            return `
                <tr>
                    ${isAdmin ? `<td><strong>${this._esc(log.displayName)}</strong> <br><small>${this._esc(log.username)}</small></td>` : ''}
                    <td>${UI.formatDate(log.clockIn)}</td>
                    <td>${log.clockOut ? UI.formatDate(log.clockOut) : '—'}</td>
                    <td>${duration}</td>
                    <td><span class="att-status-badge ${statusCls}">${statusLabel}</span></td>
                </tr>
            `;
        }).join('');
    },

    _formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    },

    _esc(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
