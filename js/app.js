/* ══════════════════════════════════════════
   app.js — Entry Point, Dashboard & Routing
   Baskin Robbins IMS
══════════════════════════════════════════ */

/* Chart references */
let chartCategory = null;
let chartDonut = null;

/* ────────────────────────────────────────
   INIT
──────────────────────────────────────── */
function initApp() {
    DB.seedData();

    const loggedIn = Auth.init();
    if (loggedIn) {
        showApp();
    } else {
        showLogin();
    }
}

/* ────────────────────────────────────────
   LOGIN PAGE
──────────────────────────────────────── */
function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Update user chip
    document.getElementById('user-name').textContent = Auth.getName();
    document.getElementById('user-role').textContent = Auth.getRole();
    document.getElementById('user-avatar').textContent = Auth.getName().charAt(0).toUpperCase();

    // Apply role visibility
    Auth.applyRoleUI();

    // Init modules
    Inventory.init();
    Attendance.init();
    Reports.init();
    Settings.init();

    // Show dashboard
    UI.showView('dashboard');
    refreshDashboard();

    // Bind nav
    bindNavigation();

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboard-greeting').textContent = `${greeting}, ${Auth.getName()}! 👋`;
}

/* ────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────── */
function bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const view = link.dataset.view;
            if (!view) return;

            // Staff can't access admin-only views
            if (link.classList.contains('admin-only') && !Auth.isAdmin()) return;

            UI.showView(view);
            if (view === 'inventory') Inventory.render();
            if (view === 'attendance') Attendance.render();
            if (view === 'reports') Reports.generate();
            if (view === 'settings') Settings.renderStaffList();

            // Close sidebar on mobile
            closeSidebar();
        });
    });

    // Logout buttons
    ['logout-btn', 'topbar-logout'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            Auth.logout();
            destroyCharts();
            showLogin();
            UI.toast('Logged out successfully.', 'info');
        });
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('hidden');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.add('hidden');
}

/* ────────────────────────────────────────
   LOGIN FORM
──────────────────────────────────────── */
document.getElementById('login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');

    if (Auth.login(username, password)) {
        errEl.classList.add('hidden');
        showApp();
    } else {
        errEl.classList.remove('hidden');
    }
});

// Toggle password visibility
document.getElementById('toggle-password')?.addEventListener('click', () => {
    const inp = document.getElementById('login-password');
    const icon = document.querySelector('#toggle-password i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'ph ph-eye-slash';
    } else {
        inp.type = 'password';
        icon.className = 'ph ph-eye';
    }
});

/* ────────────────────────────────────────
   DASHBOARD
──────────────────────────────────────── */
const App = { refreshDashboard: () => refreshDashboard() };

function refreshDashboard() {
    const items = DB.getInventory();
    const lowItems = items.filter(i => i.quantity > 0 && i.quantity <= i.threshold);
    const outItems = items.filter(i => i.quantity === 0);
    const totalItems = items.length;

    UI.setStatValue('stat-total', totalItems);
    UI.setStatValue('stat-instock', items.filter(i => i.quantity > i.threshold).length);
    UI.setStatValue('stat-low', lowItems.length + outItems.length);

    // Low stock badge on sidebar
    const badge = document.getElementById('sidebar-low-badge');
    const lowCount = lowItems.length + outItems.length;
    if (badge) {
        badge.textContent = lowCount;
        badge.classList.toggle('hidden', lowCount === 0);
    }

    // Low stock alerts section
    renderLowStockAlerts([...lowItems, ...outItems]);


    // Charts
    renderCharts(items);
}

function renderLowStockAlerts(items) {
    const container = document.getElementById('low-stock-list');
    if (!container) return;
    if (items.length === 0) {
        container.innerHTML = '<p style="color:var(--green);font-size:.875rem;text-align:center;padding:.75rem;">✅ All items are adequately stocked!</p>';
        return;
    }
    container.innerHTML = items.slice(0, 8).map(item => `
    <div class="low-stock-item">
      <div class="item-info">
        <strong>${item.name}</strong>
        <span>${item.category} · Threshold: ${item.threshold}</span>
      </div>
      <span class="low-stock-qty">${item.quantity === 0 ? 'OUT' : item.quantity + ' left'}</span>
    </div>
  `).join('');
}

/* ────────────────────────────────────────
   CHARTS
──────────────────────────────────────── */
const CHART_COLORS = ['#0d9488', '#db2777', '#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#64748b'];

function renderCharts(items) {
    const categories = ['Bulk', 'Roll cakes', 'Cakes', 'Toppings', 'Bakery', 'Packaging', 'Supplies'];

    // Category bar chart — average qty per category
    const catData = categories.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        return catItems.reduce((s, i) => s + i.quantity, 0);
    });

    const barCtx = document.getElementById('chart-category');
    if (barCtx) {
        if (chartCategory) chartCategory.destroy();
        chartCategory = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Total Quantity',
                    data: catData,
                    backgroundColor: CHART_COLORS,
                    borderRadius: 8,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b' } },
                },
            },
        });
    }

    // Donut chart — item count by category
    const donutData = categories.map(cat => items.filter(i => i.category === cat).length);
    const donutCtx = document.getElementById('chart-donut');
    if (donutCtx) {
        if (chartDonut) chartDonut.destroy();
        chartDonut = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: donutData,
                    backgroundColor: CHART_COLORS,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#475569', font: { size: 12 }, boxWidth: 14, padding: 12 },
                    },
                },
                cutout: '65%',
            },
        });
    }
}

function destroyCharts() {
    if (chartCategory) { chartCategory.destroy(); chartCategory = null; }
    if (chartDonut) { chartDonut.destroy(); chartDonut = null; }
}

/* ────────────────────────────────────────
   SETTINGS MODULE (inline)
──────────────────────────────────────── */
const Settings = {
    init() {
        this._bindPasswordChange();
        this._bindResetData();
        this._bindStaffManagement();
        this.renderStaffList();
    },

    _bindPasswordChange() {
        document.getElementById('change-password-form')?.addEventListener('submit', e => {
            e.preventDefault();
            const cur = document.getElementById('current-pw').value;
            const nw = document.getElementById('new-pw').value;
            const conf = document.getElementById('confirm-pw').value;
            const err = document.getElementById('pw-error');
            if (nw !== conf) { err.textContent = 'Passwords do not match.'; err.classList.remove('hidden'); return; }
            const res = Auth.changePassword(cur, nw);
            if (res.ok) {
                err.classList.add('hidden');
                document.getElementById('change-password-form').reset();
                UI.toast('Password updated successfully!', 'success');
            } else {
                err.textContent = res.msg;
                err.classList.remove('hidden');
            }
        });
    },

    _bindResetData() {
        document.getElementById('reset-data-btn')?.addEventListener('click', async () => {
            const ok = await UI.confirm('Reset All Data', 'This will permanently delete ALL inventory items, transactions, and users. This cannot be undone!');
            if (!ok) return;
            Object.values(DB_KEYS).forEach(k => localStorage.removeItem(k));
            UI.toast('All data reset. Reloading...', 'warning');
            setTimeout(() => window.location.reload(), 1500);
        });
    },

    _bindStaffManagement() {
        document.getElementById('add-staff-form')?.addEventListener('submit', e => {
            e.preventDefault();
            const displayName = document.getElementById('staff-display-name').value.trim();
            const username = document.getElementById('staff-username').value.trim();
            const password = document.getElementById('staff-password').value;

            if (DB.getUserByUsername(username)) {
                UI.toast('Username already exists!', 'error');
                return;
            }

            DB.addUser({
                id: genId(),
                username,
                password,
                role: 'Staff',
                displayName
            });

            UI.toast(`Account created for ${displayName}!`, 'success');
            document.getElementById('add-staff-form').reset();
            this.renderStaffList();
        });
    },

    renderStaffList() {
        const tbody = document.getElementById('staff-list-tbody');
        if (!tbody) return;
        const staffs = DB.getUsers().filter(u => u.role === 'Staff');

        if (staffs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--text-muted);">No staff accounts found.</td></tr>';
            return;
        }

        tbody.innerHTML = staffs.map(u => `
            <tr>
                <td>${u.displayName}</td>
                <td>${u.username}</td>
                <td>
                    <button class="btn-action delete" onclick="Settings.deleteStaff('${u.id}', '${u.displayName}')" title="Delete Account">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async deleteStaff(id, name) {
        const ok = await UI.confirm('Delete Staff Account', `Are you sure you want to delete the account for ${name}?`);
        if (!ok) return;
        DB.deleteUser(id);
        UI.toast(`Account for ${name} deleted.`, 'info');
        this.renderStaffList();
    }
};

/* ────────────────────────────────────────
   BOOT
──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initApp);
