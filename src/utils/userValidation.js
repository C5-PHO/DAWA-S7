export function fail(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

export function validatePassword(password) {
    if (typeof password !== 'string' || !/^(?=.*[A-Z])(?=.*\d)(?=.*[#$%&*@]).{8,}$/.test(password)) {
        fail('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (# $ % & * @).');
    }
    if (Buffer.byteLength(password, 'utf8') > 72) fail('La contraseña no puede superar 72 bytes.');
}

export function profileData(input) {
    const data = {};
    for (const field of ['name', 'lastName', 'email', 'phoneNumber']) {
        if (typeof input[field] !== 'string' || !input[field].trim()) fail(`El campo ${field} es requerido.`);
        data[field] = input[field].trim();
    }
    data.email = data.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fail('El email no es válido.');
    if (!/^[+\d\s()-]{6,20}$/.test(data.phoneNumber)) fail('El teléfono debe contener entre 6 y 20 caracteres válidos.');
    if (typeof input.birthdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthdate)) fail('La fecha de nacimiento es requerida.');
    const date = new Date(input.birthdate + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.birthdate || date > new Date() || date.getUTCFullYear() < 1900) fail('La fecha de nacimiento no es válida.');
    data.birthdate = date;
    for (const field of ['url_profile', 'address']) {
        if (input[field] != null && typeof input[field] !== 'string') fail(`El campo ${field} no es válido.`);
        data[field] = (input[field] || '').trim();
    }
    if (data.url_profile) {
        try { if (!['http:', 'https:'].includes(new URL(data.url_profile).protocol)) throw new Error(); }
        catch { fail('La URL del perfil debe comenzar con http:// o https://.'); }
    }
    return data;
}

export function publicUser(user) {
    const birth = user.birthdate;
    const today = new Date();
    let age = birth ? today.getUTCFullYear() - birth.getUTCFullYear() : null;
    if (birth && (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()))) age--;
    return { id: user._id, name: user.name, lastName: user.lastName, email: user.email,
        phoneNumber: user.phoneNumber, birthdate: birth?.toISOString().slice(0, 10), age,
        url_profile: user.url_profile || '', address: user.address || '',
        roles: user.roles.map(role => role.name), createdAt: user.createdAt, updatedAt: user.updatedAt };
}
