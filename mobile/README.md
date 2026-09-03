# MisTorneos Staff (Expo)

App móvil para admin, organizador y turno: listar torneos/partidos, control en vivo, QR y pasador Bluetooth.

## Setup

1. Copia variables del `.env.local` del monorepo a `mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

En dispositivo físico, `EXPO_PUBLIC_API_URL` debe ser la IP LAN de tu PC (no `localhost`).

2. Instala dependencias:

```bash
cd mobile
npm install
```

3. Arranca Next.js en el root (`npm run dev`) para las APIs `/api/mobile/*` y `/api/live/*`.

## Correr la app

```bash
cd mobile
npx expo start
```

Para pasador HID (volume / AB Shutter3) usa **development build**, no Expo Go:

```bash
npx expo run:android
npx expo run:ios
```

## Login

Solo cuentas con rol `admin`, `organizador` o `turno`. Jugadores reciben "Esta app es solo para staff".

## QR

Escanea `https://<dominio>/live/{partidoId}` o `mistorneos://partido/{partidoId}`.

## Pasador

Ajustes → Pasador: asigna AB Shutter3 a J1 y J2. Los bindings se guardan en el teléfono.
