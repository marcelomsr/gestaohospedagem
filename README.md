# Gestao Hospedagem

App frontend para gestao de reservas (Airbnb/Booking/Direto) com Supabase.

## Requisitos

- Node.js 20+
- npm 10+

## Setup rapido

```bash
npm install
cp .env.example .env.local
```

Preencha o `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publishable
VITE_SUPABASE_TABLE=reservations
```

## Comandos

- `npm run dev`: ambiente local
- `npm run build`: build de producao
- `npm run preview`: validar build local

## Rotina recomendada

```bash
git pull
npm install
npm run dev
```

## Observacoes

- Nao versionar `.env` e `.env.local`.
- O projeto agora usa variaveis de ambiente; nao ha chave hardcoded no codigo.
