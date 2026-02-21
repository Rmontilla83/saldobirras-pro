# SaldoBirras Pro

Sistema profesional de gestión de saldos para cervecería.

## Stack
- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con RLS
- **Realtime:** Supabase Realtime (WebSockets)
- **Correos:** Resend (Fase 3)
- **Hosting:** Vercel

## Setup

### 1. Base de datos
1. Ve a [supabase.com](https://supabase.com) → tu proyecto → SQL Editor
2. Pega y ejecuta `supabase/001_schema.sql`
3. Anota el Business ID que devuelve

### 2. Crear primer usuario
1. En Supabase → Authentication → Users → Add User
2. Email: tu correo, Password: tu contraseña
3. Anota el User ID
4. En SQL Editor ejecuta:
```sql
INSERT INTO users (id, business_id, name, email, role)
VALUES ('USER_ID_AQUI', 'BUSINESS_ID_AQUI', 'Tu Nombre', 'tu@email.com', 'owner');
```

### 3. Variables de entorno
Copia `.env.local` y llena las claves de Supabase.

### 4. Ejecutar
```bash
npm install
npm run dev
```

### 5. Deploy a Vercel
```bash
npm i -g vercel
vercel
```

## Estructura
```
src/
├── app/
│   ├── api/          ← API Routes (backend)
│   │   ├── customers/
│   │   ├── transactions/
│   │   └── scan/
│   ├── dashboard/    ← Panel principal
│   ├── login/        ← Autenticación
│   └── layout.tsx
├── components/       ← Componentes React
├── lib/
│   ├── supabase-browser.ts  ← Client para navegador
│   ├── supabase-admin.ts    ← Client para API (service role)
│   ├── store.ts             ← Zustand state
│   ├── types.ts             ← TypeScript types
│   └── utils.ts             ← Utilidades
└── styles/
    └── globals.css   ← Tailwind + custom styles
```
