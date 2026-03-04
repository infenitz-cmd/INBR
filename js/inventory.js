/* ══════════════════════════════════════════
   inventory.js — Inventory CRUD & Rendering
   Baskin Robbins IMS
══════════════════════════════════════════ */

const Inventory = {
    /* active sale target */
    _saleItemId: null,

    init() {
        this._bindFilters();
        this._bindModal();
        this._bindSaleModal();
        this._bindExport();
        this.render();
    },

    /* ────────────────────────────────
       RENDER TABLE
    ──────────────────────────────── */
    render() {
        const items = this._filtered();
        const tbody = document.getElementById('inventory-tbody');
        const empty = document.getElementById('inventory-empty');
        const isAdmin = Auth.isAdmin();

        if (items.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        tbody.innerHTML = items.map(item => {
            const status = UI.stockStatus(item);
            return `
        <tr class="row-item" data-id="${item.id}">
          <td>
            <div class="item-cell">
              <div>
                <strong>${this._esc(item.name)}</strong>
              </div>
            </div>
          </td>
          <td>
            <span class="cat-badge">${UI.catEmoji(item.category)} ${item.category}</span>
          </td>
          <td>
            <div class="qty-wrapper">
              <button class="qty-btn qty-btn--minus btn-action" onclick="Inventory.quickAdjust('${item.id}', -1)" title="Decrease"><i class="ph ph-minus"></i></button>
              <span class="qty-display ${item.quantity === 0 ? 'text-red' : ''}">${item.quantity}</span>
              ${isAdmin ? `<button class="qty-btn qty-btn--plus btn-action" onclick="Inventory.quickAdjust('${item.id}', 1)" title="Increase"><i class="ph ph-plus"></i></button>` : ''}
            </div>
          </td>
          <td><span class="status-badge ${status.cls}">${status.dot} ${status.label}</span></td>
          ${isAdmin ? `
          <td>
            <div class="action-btns">
              <button class="btn-action edit" onclick="Inventory.openEditModal('${item.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
              <button class="btn-action delete" onclick="Inventory.deleteItem('${item.id}')" title="Delete"><i class="ph ph-trash"></i></button>
            </div>
          </td>` : ''}
        </tr>`;
        }).join('');
    },

    _filtered() {
        const q = (document.getElementById('inventory-search')?.value || '').toLowerCase();
        const cat = document.getElementById('filter-category')?.value || '';
        const st = document.getElementById('filter-stock')?.value || '';

        return DB.getInventory().filter(item => {
            if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
            if (cat && item.category !== cat) return false;
            if (st === 'in' && item.quantity <= item.threshold) return false;
            if (st === 'low' && (item.quantity === 0 || item.quantity > item.threshold)) return false;
            if (st === 'out' && item.quantity !== 0) return false;
            return true;
        });
    },

    _bindFilters() {
        ['inventory-search', 'filter-category', 'filter-stock'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.render());
        });
    },

    /* ────────────────────────────────
       ADD / EDIT MODAL
    ──────────────────────────────── */
    _bindModal() {
        document.getElementById('add-item-btn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('modal-close-btn')?.addEventListener('click', () => UI.hideOverlay('item-modal'));
        document.getElementById('modal-cancel-btn')?.addEventListener('click', () => UI.hideOverlay('item-modal'));
        document.getElementById('item-form')?.addEventListener('submit', e => { e.preventDefault(); this._saveItem(); });

        // Qty +/- in modal
        document.getElementById('qty-minus')?.addEventListener('click', () => {
            const inp = document.getElementById('item-quantity');
            inp.value = Math.max(0, parseInt(inp.value || 0) - 1);
        });
        document.getElementById('qty-plus')?.addEventListener('click', () => {
            const inp = document.getElementById('item-quantity');
            inp.value = parseInt(inp.value || 0) + 1;
        });
    },

    openAddModal() {
        document.getElementById('modal-title').textContent = 'Add New Item';
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        document.getElementById('item-quantity').value = '0';
        document.getElementById('item-threshold').value = '1';
        UI.showOverlay('item-modal');
        Auth.applyRoleUI();
    },

    openEditModal(id) {
        const item = DB.getItemById(id);
        if (!item) return;
        document.getElementById('modal-title').textContent = 'Edit Item';
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-threshold').value = item.threshold || 1;
        UI.showOverlay('item-modal');
        Auth.applyRoleUI();
    },

    _saveItem() {
        const id = document.getElementById('item-id').value;
        const oldItem = id ? DB.getItemById(id) : null;
        const newQty = parseInt(document.getElementById('item-quantity').value) || 0;

        const item = {
            id: id || genId(),
            name: document.getElementById('item-name').value.trim(),
            category: document.getElementById('item-category').value,
            quantity: newQty,
            threshold: parseInt(document.getElementById('item-threshold').value) || 1,
            createdAt: oldItem ? oldItem.createdAt : Date.now(),
            updatedAt: Date.now(),
        };

        if (id) {
            DB.updateItem(item);
            UI.toast(`"${item.name}" updated!`, 'success');
        } else {
            DB.addItem(item);
            UI.toast(`"${item.name}" added to inventory!`, 'success');
        }

        UI.hideOverlay('item-modal');
        this.render();
        App.refreshDashboard();
    },

    /* ── Quick qty adjust (±1 buttons in table) ── */
    quickAdjust(id, delta) {
        const item = DB.getItemById(id);
        if (!item) return;
        const newQty = Math.max(0, item.quantity + delta);
        const updated = { ...item, quantity: newQty, updatedAt: Date.now() };
        DB.updateItem(updated);
        this.render();
        App.refreshDashboard();
        UI.toast(`${item.name}: qty ${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? 'success' : 'info');
    },

    /* ── Sale Modal (Staff) ── */
    _bindSaleModal() {
        document.getElementById('sale-modal-close')?.addEventListener('click', () => { this._saleItemId = null; UI.hideOverlay('sale-modal'); });
        document.getElementById('sale-cancel-btn')?.addEventListener('click', () => { this._saleItemId = null; UI.hideOverlay('sale-modal'); });
        document.getElementById('sale-confirm-btn')?.addEventListener('click', () => this._confirmSale());

        document.getElementById('sale-qty-minus')?.addEventListener('click', () => {
            const inp = document.getElementById('sale-qty');
            inp.value = Math.max(1, parseInt(inp.value || 1) - 1);
        });
        document.getElementById('sale-qty-plus')?.addEventListener('click', () => {
            const inp = document.getElementById('sale-qty');
            inp.value = parseInt(inp.value || 1) + 1;
        });
    },

    openSaleModal(id) {
        const item = DB.getItemById(id);
        if (!item) return;
        if (item.quantity === 0) { UI.toast('This item is out of stock!', 'error'); return; }
        this._saleItemId = id;
        document.getElementById('sale-item-name').textContent = item.name;
        document.getElementById('sale-qty').value = '1';
        document.getElementById('sale-stock-info').textContent = `Available: ${item.quantity}`;
        UI.showOverlay('sale-modal');
    },

    _confirmSale() {
        const id = this._saleItemId;
        const item = id ? DB.getItemById(id) : null;
        if (!item) return;
        const qty = parseInt(document.getElementById('sale-qty').value) || 0;
        if (qty <= 0) { UI.toast('Quantity must be at least 1', 'warning'); return; }
        if (qty > item.quantity) { UI.toast(`Only ${item.quantity} in stock!`, 'error'); return; }

        const updated = { ...item, quantity: item.quantity - qty, updatedAt: Date.now() };
        DB.updateItem(updated);
        UI.hideOverlay('sale-modal');
        this._saleItemId = null;
        this.render();
        App.refreshDashboard();
        UI.toast(`Sale recorded: ${qty} × ${item.name}`, 'success');
    },

    /* ── Delete ── */
    async deleteItem(id) {
        const item = DB.getItemById(id);
        if (!item) return;
        const ok = await UI.confirm('Delete Item', `Delete "${item.name}" from inventory? This cannot be undone.`);
        if (!ok) return;
        DB.deleteItem(id);
        this.render();
        App.refreshDashboard();
        UI.toast(`"${item.name}" deleted.`, 'info');
    },

    /* ── Export CSV ── */
    _bindExport() {
        document.getElementById('export-stock-btn')?.addEventListener('click', () => this.exportCSV());
    },

    exportCSV() {
        const items = DB.getInventory();
        if (items.length === 0) { UI.toast('No stock data to export.', 'warning'); return; }

        const header = ['Item Name', 'Category', 'Quantity', 'Status', 'Last Updated'];
        const dataRows = items.map(item => {
            const status = UI.stockStatus(item);
            const date = new Date(item.updatedAt || item.createdAt).toLocaleString('en-IN');
            return [item.name, item.category, item.quantity, status.label, date];
        });

        const csvContent = [header, ...dataRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Baskin_Robbins_Stock_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Stock sheet exported successfully!', 'success');
    },

    _esc(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
};
