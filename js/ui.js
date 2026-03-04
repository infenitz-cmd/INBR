/* ══════════════════════════════════════════
   ui.js — UI Helpers & Shared functionality
   Baskin Robbins IMS
══════════════════════════════════════════ */

const UI = {
    /* ── TOAST ── */
    toast(message, type = 'info', duration = 3500) {
        const icons = { success: 'ph-check-circle', error: 'ph-x-circle', info: 'ph-info', warning: 'ph-warning' };
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duration);
    },

    /* ── CONFIRM DIALOG ── */
    confirm(title, message) {
        return new Promise(resolve => {
            const dialog = document.getElementById('confirm-dialog');
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            this.showOverlay('confirm-dialog');

            const ok = document.getElementById('confirm-ok');
            const cancel = document.getElementById('confirm-cancel');

            const cleanup = () => this.hideOverlay('confirm-dialog');
            ok.onclick = () => { cleanup(); resolve(true); };
            cancel.onclick = () => { cleanup(); resolve(false); };
        });
    },

    /* ── MODAL ── */
    showOverlay(id) {
        const el = document.getElementById(id);
        el.classList.remove('hidden');
        requestAnimationFrame(() => el.classList.add('show'));
    },
    hideOverlay(id) {
        const el = document.getElementById(id);
        el.classList.remove('show');
        el.addEventListener('transitionend', () => el.classList.add('hidden'), { once: true });
    },

    /* ── VIEW ROUTING ── */
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewId}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (navItem) navItem.classList.add('active');

        // Update page title (topbar)
        const titles = { dashboard: 'Dashboard', inventory: 'Inventory', transactions: 'Transactions', reports: 'Reports', settings: 'Settings' };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = titles[viewId] || viewId;
    },

    /* ── NUMBER FORMATTER ── */
    currency(val) {
        return '₹' + Number(val || 0).toFixed(2);
    },
    formatDate(ts) {
        return new Date(ts).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    },
    formatDateShort(ts) {
        return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    /* ── CATEGORY HELPERS ── */
    catEmoji(cat) {
        const m = {
            'Bulk': '📦',
            'Roll cakes': '🍥',
            'Cakes': '🎂',
            'Toppings': '🍫',
            'Bakery': '🥐',
            'Packaging': '🥡',
            'Supplies': '🛠️'
        };
        return m[cat] || '📦';
    },
    catColor(cat) {
        const m = {
            'Bulk': 'hsl(210, 20%, 50%)',
            'Roll cakes': 'hsl(330, 85%, 65%)',
            'Cakes': 'hsl(280, 70%, 60%)',
            'Toppings': 'hsl(38, 95%, 58%)',
            'Bakery': 'hsl(45, 80%, 50%)',
            'Packaging': 'hsl(174, 72%, 56%)',
            'Supplies': 'hsl(270, 60%, 65%)'
        };
        return m[cat] || 'var(--text-secondary)';
    },

    /* ── STOCK STATUS ── */
    stockStatus(item) {
        if (item.quantity === 0) return { label: 'Out of Stock', cls: 'out-stock', dot: '⬤' };
        if (item.quantity <= item.threshold) return { label: 'Low Stock', cls: 'low-stock', dot: '⬤' };
        return { label: 'In Stock', cls: 'in-stock', dot: '⬤' };
    },

    /* ── STAT CARD VALUE UPDATE ── */
    setStatValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value;
        el.classList.remove('updated');
        void el.offsetWidth; // reflow
        el.classList.add('updated');
    },
};
