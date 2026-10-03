const page = document.body.dataset.page;
const protectedPage = ['profile', 'user', 'admin'].includes(page);
let expiryTimer;

function message(text, error = false) {
    const box = document.getElementById('message');
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.classList.toggle('is-error', error);
}

async function logout() {
    clearTimeout(expiryTimer);
    sessionStorage.removeItem('token');
    try { await fetch('/api/auth/signOut', { method: 'POST' }); }
    finally { location.replace('/signIn'); }
}

function tokenPayload(token) {
    try {
        const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(segment));
    } catch { return null; }
}

async function api(path, options = {}) {
    const token = sessionStorage.getItem('token');
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    const data = await response.json();
    if (response.status === 401 && protectedPage) { await logout(); throw new Error('Tu sesión ha caducado.'); }
    if (response.status === 403) { location.replace('/403'); throw new Error('Acceso denegado.'); }
    if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
    return data;
}

function dateLabel(value) { return value ? new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'; }
function rolesLabel(user) { return user.roles.includes('admin') ? 'Administrador' : 'Usuario'; }
function fillDetails(target, user) {
    target.replaceChildren();
    const fields = [['Nombres', user.name], ['Apellidos', user.lastName], ['Correo', user.email], ['Teléfono', user.phoneNumber], ['Nacimiento', dateLabel(user.birthdate)], ['Edad', user.age == null ? '—' : `${user.age} años`], ['Dirección', user.address || 'Sin registrar'], ['URL del perfil', user.url_profile || 'Sin registrar'], ['Roles', user.roles.join(', ')], ['Registro', dateLabel(user.createdAt)]];
    for (const [label, value] of fields) {
        const row = document.createElement('div'); row.className = 'detail-row';
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = value || '—';
        row.append(dt, dd); target.append(row);
    }
}

function navigation(user) {
    const nav = document.getElementById('navigation'); nav.replaceChildren();
    const links = [['Mi dashboard', '/dashboard/user'], ['Mi cuenta', '/profile']];
    if (user.roles.includes('admin')) links.unshift(['Administración', '/dashboard/admin']);
    for (const [label, href] of links) { const li = document.createElement('li'); const a = document.createElement('a'); a.href = href; a.textContent = label; li.append(a); nav.append(li); }
    const li = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-flat'; button.textContent = 'Salir'; button.addEventListener('click', logout); li.append(button); nav.append(li);
}

async function busyForm(form, action) {
    const button = form.querySelector('button[type=submit]'); button.disabled = true;
    try { await action(Object.fromEntries(new FormData(form))); }
    catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
}

async function initialize() {
    if (window.M) M.AutoInit();
    const birth = document.getElementById('birthdate'); if (birth) birth.max = new Date().toISOString().slice(0, 10);
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        if (page === 'signIn' && new URLSearchParams(location.search).has('registered')) message('Cuenta creada. Ya puedes iniciar sesión.');
        // Esta pestaña debe tener su propio token, aunque exista una cookie de otra pestaña.
        authForm.addEventListener('submit', event => {
            event.preventDefault(); busyForm(authForm, async data => {
                if (page === 'signUp') { await api('/api/auth/signUp', { method: 'POST', body: JSON.stringify(data) }); location.href = '/signIn?registered=1'; }
                else {
                    const result = await api('/api/auth/signIn', { method: 'POST', body: JSON.stringify(data) });
                    sessionStorage.setItem('token', result.token);
                    const user = await api('/api/users/me');
                    location.href = user.roles.includes('admin') ? '/dashboard/admin' : '/dashboard/user';
                }
            });
        });
        return;
    }
    if (!protectedPage) return;
    const payload = tokenPayload(sessionStorage.getItem('token') || '');
    if (!payload?.exp || payload.exp * 1000 <= Date.now()) { await logout(); return; }
    const remaining = payload.exp * 1000 - Date.now();
    expiryTimer = setTimeout(logout, Math.min(remaining, 2147483647));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && payload.exp * 1000 <= Date.now()) logout(); });
    const user = await api('/api/users/me'); navigation(user);
    if (page === 'admin' && !user.roles.includes('admin')) { location.replace('/403'); return; }
    document.querySelector('[data-protected]').hidden = false;
    if (page === 'profile') {
        document.getElementById('avatar').textContent = (user.name[0] + user.lastName[0]).toUpperCase();
        document.getElementById('profile-name').textContent = `${user.name} ${user.lastName}`;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-age').textContent = `${user.age} años`;
        document.getElementById('profile-created').textContent = dateLabel(user.createdAt);
        const role = document.createElement('span'); role.className = 'chip'; role.textContent = rolesLabel(user); document.getElementById('profile-roles').append(role);
        const form = document.getElementById('profile-form');
        for (const field of ['name', 'lastName', 'email', 'phoneNumber', 'birthdate', 'url_profile', 'address']) form.elements[field].value = user[field] || '';
        if (window.M) M.updateTextFields();
        form.addEventListener('submit', event => { event.preventDefault(); busyForm(form, async data => { await api('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }); location.href = '/profile?saved=1'; }); });
        if (new URLSearchParams(location.search).has('saved')) message('Tus cambios se guardaron correctamente.');
    } else if (page === 'user') {
        document.getElementById('welcome').textContent = `Hola, ${user.name}.`;
        fillDetails(document.getElementById('user-summary'), user);
    } else {
        const users = await api('/api/users'); document.getElementById('user-count').textContent = users.length;
        const tbody = document.getElementById('users-table');
        for (const item of users) {
            const row = document.createElement('tr');
            for (const value of [`${item.name} ${item.lastName || ''}`, item.email, rolesLabel(item), dateLabel(item.createdAt)]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
            const cell = document.createElement('td'); const button = document.createElement('button'); button.className = 'btn-flat details-button'; button.textContent = 'Ver usuario';
            button.addEventListener('click', async () => { try { const detail = await api(`/api/users/${item.id}`); document.getElementById('detail-name').textContent = `${detail.name} ${detail.lastName || ''}`; fillDetails(document.getElementById('user-detail'), detail); M.Modal.getInstance(document.getElementById('user-modal')).open(); } catch (error) { message(error.message, true); } });
            cell.append(button); row.append(cell); tbody.append(row);
        }
    }
}
initialize().catch(error => message(error.message, true));
