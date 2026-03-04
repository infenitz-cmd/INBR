/* ══════════════════════════════════════════
   db.js — LocalStorage Persistence Layer
   Baskin Robbins IMS
══════════════════════════════════════════ */

const DB_KEYS = {
  USERS: 'ss_users',
  INVENTORY: 'ss_inventory',
  ATTENDANCE: 'ss_attendance',
  SESSION: 'ss_session',
  INITIALIZED: 'ss_initialized',
  TRANSACTIONS: 'ss_transactions',
};

const DB = {
  /* ── Generic helpers ── */
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  /* ── Users ── */
  getUsers() { return this.get(DB_KEYS.USERS) || []; },
  saveUsers(users) { this.set(DB_KEYS.USERS, users); },
  addUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  },
  deleteUser(userId) {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
  },
  getUserByUsername(username) {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  /* ── Inventory ── */
  getInventory() { return this.get(DB_KEYS.INVENTORY) || []; },
  saveInventory(items) { this.set(DB_KEYS.INVENTORY, items); },
  getItemById(id) { return this.getInventory().find(i => i.id === id) || null; },
  addItem(item) {
    const items = this.getInventory();
    items.push(item);
    this.saveInventory(items);
  },
  updateItem(updated) {
    const items = this.getInventory().map(i => i.id === updated.id ? updated : i);
    this.saveInventory(items);
  },
  deleteItem(id) {
    this.saveInventory(this.getInventory().filter(i => i.id !== id));
  },

  /* ── Attendance ── */
  getAttendance() { return this.get(DB_KEYS.ATTENDANCE) || []; },
  saveAttendance(logs) { this.set(DB_KEYS.ATTENDANCE, logs); },
  addAttendanceLog(log) {
    const logs = this.getAttendance();
    logs.unshift(log); // newest first
    this.saveAttendance(logs);
  },
  updateAttendanceLog(updated) {
    const logs = this.getAttendance().map(l => l.id === updated.id ? updated : l);
    this.saveAttendance(logs);
  },
  getActiveClockIn(username) {
    return this.getAttendance().find(l => l.username === username && !l.clockOut) || null;
  },

  /* ── Session ── */
  getSession() { return this.get(DB_KEYS.SESSION); },
  saveSession(session) { this.set(DB_KEYS.SESSION, session); },
  clearSession() { localStorage.removeItem(DB_KEYS.SESSION); },

  /* ── Transactions ── */
  getTransactions() { return this.get(DB_KEYS.TRANSACTIONS) || []; },
  saveTransactions(logs) { this.set(DB_KEYS.TRANSACTIONS, logs); },
  addTransaction(log) {
    const logs = this.getTransactions();
    logs.unshift(log); // newest first
    this.saveTransactions(logs);
  },

  /* ── Init / Seed ── */
  isInitialized() { return !!this.get(DB_KEYS.INITIALIZED); },
  markInitialized() { this.set(DB_KEYS.INITIALIZED, true); },

  seedData() {
    if (this.isInitialized()) return;

    /* Default users */
    this.saveUsers([
      { id: 'u1', username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Admin User' },
      { id: 'u2', username: 'staff', password: 'staff123', role: 'Staff', displayName: 'Staff Member' },
    ]);

    const now = Date.now();
    const bulkItems = [
      "Vanilla", "Very Berry Strawberry", "Honey Nut Crunch", "Butter Scotch Ribbon",
      "Choc Chip Mousse Royal Frozen", "Fruit Overload", "Choc Almond Praline",
      "Banana N Strawberry", "Black Current", "Three Cheers", "Gold Medal Ribbon",
      "Pralines N Cream", "Mint Milk Chocolate Chips", "Bavarian Chocolate",
      "Cotton Candy", "Mississippi Mud", "Hop-Scotch Butterscotch", "Belgian Bliss Ice cream",
      "Splish Splash", "Alphonso Mango", "Dutch Chocolate", "Roasted Californian Almond",
      "Roasted Coffee Crème", "Shooting Star", "Oreo N Cream", "Lotus Biscoff",
      "Blueberry N White Chocolate", "Hersheys Kisses Caramel", "Naughty Nutella",
      "Ferrero Moment Mousse", "Brown Biscuit Boba", "Salted Butter Popcorn",
      "Rabadi Jalebi", "Peanut Butter Cup", "Hazelnut Gelato", "Mango & Cream Gelato",
      "Salted Caramel Gelato", "Cotton Candy Gelato", "Blueberry Cheese Cake Gelato",
      "Tender Coconut", "Strawberry Gelato", "Saffron Gelato", "Lotus Biscoff Gelato"
    ];

    const packagingItems = [
      "S.Cup", "S. Cup Lid", "R. Cup", "R. Cup Lid", "DS Cup", "DS Cup Lid",
      "500 Ml Cup", "500 Ml Cup Lid", "700 Ml Cup", "700 Ml Cup Lid",
      "1000 Ml Cup", "1000 Ml Cup Lid", "Princess Cup", "Princess Cup Lid",
      "Mermaid Cup", "Mermaid Cup Lid", "Knight Cup", "Knight Cup Lid",
      "Unicorn Cup", "Unicorn Cup Lid", "Lollypop Cup", "Lollypop Cup Lid"
    ];

    const otherItems = [
      { name: 'Butter Croissants', category: 'Bakery', quantity: 10 },
      { name: 'Chocolate Roll Cake', category: 'Roll cakes', quantity: 5 },
      { name: 'Red Velvet Cake Slice', category: 'Cakes', quantity: 8 },
      { name: 'Chocolate Ganache', category: 'Toppings', quantity: 12 },
      { name: 'Milk Powder', category: 'Bulk', quantity: 4 },
      { name: 'Kitchen Towels', category: 'Supplies', quantity: 20 }
    ];

    const inventory = [
      ...bulkItems.map(name => ({ id: genId(), name, category: 'Bulk', quantity: 2, threshold: 1, createdAt: now })),
      ...packagingItems.map(name => ({ id: genId(), name, category: 'Packaging', quantity: 2, threshold: 1, createdAt: now })),
      ...otherItems.map(item => ({ id: genId(), name: item.name, category: item.category, quantity: item.quantity, threshold: 1, createdAt: now }))
    ];

    this.saveInventory(inventory);

    this.markInitialized();
  },
};

/* Utility — generate unique ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
