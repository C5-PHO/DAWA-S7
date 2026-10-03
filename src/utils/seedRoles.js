import roleRepository from '../repositories/RoleRepository.js';

export default async function seedRoles() {
    
    // También completa una base que solo tenga uno de los roles.
    for (const name of ['user', 'admin']) await roleRepository.ensure(name);
}

