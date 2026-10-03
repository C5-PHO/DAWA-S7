# Laboratorio 07: seguridad con JWT

Aplicación Express con MongoDB, EJS y Materialize. Permite registro, inicio de sesión, edición del perfil y dashboards protegidos por roles.

## Ejecutar

Requisitos: Node.js 22 y un servidor MongoDB en funcionamiento. Compass es el cliente para consultar datos; no reemplaza al servidor.

```powershell
npm install
Copy-Item .env.example .env
```

Si ya tienes `.env`, conserva ese archivo. Configura un `JWT_SECRET` aleatorio y una contraseña válida en `ADMIN_PASSWORD`. Las contraseñas con `#` deben ir entre comillas dentro de `.env`.

```powershell
npm run dev
```

Abre http://localhost:3000/signIn. Si usas la instalación portable configurada en este equipo, ejecuta `npm run mongo` antes de `npm run dev`. Ese comando utiliza `%LOCALAPPDATA%\Programs\MongoDB` y guarda datos en `.mongodb/data`; no es necesario cuando MongoDB ya corre como servicio. Los datos y `.env` están excluidos de Git.

## Funcionalidades

- Registro con nombres, apellidos, teléfono, fecha de nacimiento, email y contraseña. Siempre asigna `user`.
- Contraseña: al menos ocho caracteres, una mayúscula, un dígito y uno de `# $ % & * @`. La complejidad se valida antes de guardar el hash bcrypt; la contraseña original no se almacena.
- Perfil: edición de datos personales, URL del perfil, dirección y contraseña opcional. Calcula la edad a partir de la fecha de nacimiento.
- Dashboard de usuario: datos de su propia cuenta.
- Dashboard de administrador: tabla de usuarios con fecha de registro y botón para consultar detalles.
- Roles aplicados también en el servidor; ocultar enlaces no es la protección de acceso.
- Páginas 403 y 404, cierre de sesión y redirección cuando el token caduca.
- `seedUsers.js` crea el administrador definido en `.env` solo si no existe. No restablece su contraseña en cada arranque.

Se usan los nombres `phoneNumber` y `address` consistentemente en el modelo, los formularios y la API; la guía contiene las variantes tipográficas `phoneNumer` y `adress`.

## JWT y navegación

El navegador guarda el JWT en `sessionStorage` y envía `Authorization: Bearer ...` a la API. El inicio de sesión también establece una cookie HttpOnly para que Express valide el JWT antes de servir las páginas EJS protegidas, ya que una navegación normal no envía automáticamente el contenido de `sessionStorage`. La cookie es de sesión, SameSite=Lax y Secure en producción. La API continúa exigiendo el token Bearer.

La aplicación valida el token en el servidor. El cliente programa el cierre de sesión al expirar y también comprueba el vencimiento cuando la pestaña vuelve a estar visible. Salir borra el token de la pestaña y la cookie de navegación.

## Rutas

| Página | Ruta | Acceso |
|---|---|---|
| Iniciar sesión | `/signIn` | Público |
| Registro | `/signUp` | Público |
| Mi cuenta | `/profile` | Autenticado |
| Dashboard de usuario | `/dashboard/user` | `user` o `admin` |
| Dashboard de administrador | `/dashboard/admin` | `admin` |
| Acceso denegado | `/403` | Autenticado |
| No encontrada | Una ruta inexistente | Público, HTTP 404 |

| API | Método | Acceso |
|---|---|---|
| `/api/auth/signUp` | POST | Público |
| `/api/auth/signIn` | POST | Público |
| `/api/auth/signOut` | POST | Público |
| `/api/users/me` | GET, PATCH | Autenticado |
| `/api/users` | GET | `admin` |
| `/api/users/:id` | GET | `admin` |

Las respuestas de usuarios excluyen los hashes de contraseña. Editar el perfil no permite modificar roles.

## Capturas para el laboratorio

1. **SignIn:** abre `/signIn` y captura el formulario.
2. **SignUp:** abre `/signUp`, captura los campos y registra una cuenta con una contraseña válida.
3. **Dashboard user:** inicia sesión con esa cuenta. Se redirige a `/dashboard/user`; captura los datos.
4. **Profile:** abre Mi cuenta, edita la dirección y guarda. Captura el perfil con el mensaje de éxito y la edad calculada. Si no entra completo, usa dos capturas.
5. **403:** con la cuenta `user`, escribe `/dashboard/admin` en la barra del navegador. Captura el acceso denegado.
6. **404:** abre `/pagina-inexistente` y captura la página no encontrada.
7. **Dashboard admin:** inicia sesión con el administrador. Captura la tabla con ambas cuentas.
8. **Detalle:** pulsa Ver usuario y captura sus datos.
9. **MongoDB Compass:** conecta a `mongodb://127.0.0.1:27017`, abre `auth_db` y captura las colecciones `roles` y `users`. En `users`, muestra los campos añadidos y los roles relacionados. La contraseña se muestra como hash.
10. **Repositorio:** incluye https://github.com/C5-PHO/DAWA-S7. Los commits locales deben publicarse para que el docente vea la última versión.

También puedes evidenciar una contraseña inválida, el email duplicado y el rechazo de credenciales incorrectas. No incluyas el contenido de `.env` en capturas.

## Verificación

```powershell
npm test
```

Las pruebas necesitan MongoDB activo. Arrancan otro servidor en un puerto libre y crean una base temporal `auth_lab_test_*`. Solo eliminan esa base de pruebas al terminar; no modifican `auth_db`.

Verifican validaciones, fechas imposibles, registro, email duplicado, contraseñas incorrectas, bloqueo de asignación pública de administrador, páginas protegidas, edición de perfil y contraseña, tokens caducados, consulta de usuarios y cierre de sesión.

Materialize se sirve desde `node_modules`, por lo que el diseño no depende de una conexión al CDN. Se siguen sus componentes documentados: https://materializecss.com/getting-started.html. Las vistas siguen la documentación de EJS: https://ejs.co/.

## Limitaciones de dependencias

Se actualizaron bcrypt a la versión 6 y nodemon a la versión 3. `npm audit` todavía informa vulnerabilidades en Materialize 1.0.0 y en la cadena braces/chokidar de nodemon. La aplicación no utiliza autocomplete ni tooltips de Materialize y escribe datos de usuarios con `textContent` o escape EJS. Nodemon se utiliza únicamente en desarrollo. Estas medidas no equivalen a corregir las vulnerabilidades de las bibliotecas. Revisarlas antes de un despliegue público.

## Ideas para tus conclusiones

Adapta estas ideas a lo que aprendiste y redacta tu propia opinión:

1. Separar cliente y servidor MongoDB permitió encontrar la causa de la conexión rechazada: Compass estaba instalado, pero faltaba `mongod.exe`.
2. La organización por modelos, repositorios, servicios y controladores permitió añadir campos y editar perfiles sin concentrar toda la lógica en `server.js`.
3. JWT identifica la sesión, mientras que los roles deciden los permisos; ambos deben validarse en el backend para impedir accesos directos.
4. Validar contraseñas antes de aplicar bcrypt y excluir sus hashes de las respuestas reduce la exposición de credenciales.
5. Las pruebas de errores y permisos son necesarias además del flujo exitoso; comprobar usuarios comunes, administradores y tokens vencidos permitió verificar las reglas del laboratorio.
