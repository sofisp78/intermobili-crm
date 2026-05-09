# Deploy demo Intermobili CRM

Objetivo: publicar una demo rapida para mostrar el seguimiento de leads.

## 1. Supabase

La app usa la misma base Supabase que ya estas probando localmente.

En Supabase, confirmar:

- `supabase/demo_hardening.sql` ejecutado una vez en SQL Editor.
- Usuarios creados en Auth.
- Cada usuario tiene un registro en `public.profiles`.
- En Authentication > URL Configuration, agregar la URL de Vercel cuando exista:
  - Site URL: `https://TU-DOMINIO.vercel.app`
  - Redirect URLs: `https://TU-DOMINIO.vercel.app/**`

## 2. Variables de entorno en Vercel

En Project Settings > Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Usar los mismos valores de `.env.local`.

No hace falta subir service role key.

## 3. Deploy recomendado

Opcion simple:

1. Subir el proyecto a GitHub.
2. Importarlo desde Vercel.
3. Agregar las variables de entorno.
4. Deploy.

Opcion rapida con CLI:

```bash
npx vercel
```

Luego, para publicar a produccion:

```bash
npx vercel --prod
```

## 4. Prueba antes de mostrar

Entrar con un usuario admin y revisar:

- Login.
- Dashboard: lista de llamadas.
- Nuevo lead.
- Asignar responsable.
- Registrar contacto.
- Filtrar por responsable.

## 5. Demo script para mostrar

1. "Este es el dia de trabajo: a quien llamar y que esta atrasado."
2. Abrir un lead y mostrar historial.
3. Registrar contacto con resultado y proxima fecha.
4. Crear un lead nuevo.
5. Mostrar filtro por responsable.
