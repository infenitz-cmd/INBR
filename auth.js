/* ══════════════════════════════════════════
   auth.js — Authentication & Session Management
   Baskin Robbins IMS
══════════════════════════════════════════ */

const Auth = {
    currentUser: null,

    init() {
        const session = DB.getSession();
        if (session) {
            // Validate session user still exists
            const user = DB.getUserByUsername(session.username);
            if (user) {
                this.currentUser = user;
                return true; // logged in
            } else {
                DB.clearSession();
            }
        }
        return false;
    },

    login(username, password) {
        const user = DB.getUserByUsername(username);
        if (!user || user.password !== password) return false;
        this.currentUser = user;
        DB.saveSession({ username: user.username, role: user.role });
        return true;
    },

    logout() {
        this.currentUser = null;
        DB.clearSession();
    },

    isAdmin() { return this.currentUser && this.currentUser.role === 'Admin'; },
    isStaff() { return this.currentUser && this.currentUser.role === 'Staff'; },
    getRole() { return this.currentUser ? this.currentUser.role : null; },
    getName() { return this.currentUser ? this.currentUser.displayName : ''; },
    getUsername() { return this.currentUser ? this.currentUser.username : ''; },

    changePassword(currentPw, newPw) {
        if (!this.currentUser) return { ok: false, msg: 'Not logged in.' };
        if (this.currentUser.password !== currentPw) return { ok: false, msg: 'Current password is incorrect.' };
        if (newPw.length < 6) return { ok: false, msg: 'New password must be at least 6 characters.' };

        const users = DB.getUsers().map(u =>
            u.username === this.currentUser.username ? { ...u, password: newPw } : u
        );
        DB.saveUsers(users);
        this.currentUser = { ...this.currentUser, password: newPw };
        return { ok: true };
    },

    /* Apply role-based visibility to DOM */
    applyRoleUI() {
        const isAdmin = this.isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
        document.querySelectorAll('.staff-only').forEach(el => {
            el.style.display = isAdmin ? 'none' : '';
        });
    },
};
