# Sentinel Guard — Frontend

Secure Biodiversity IoT Monitoring System · CSG3101 Applied Project

---

## Project structure

```
sentinel-guard-web/       React web dashboard (Vite + React Router + Recharts)
sentinel-guard-mobile/    React Native mobile app (Expo + Expo Router)
```

---

## Web app — quick start

```bash
cd sentinel-guard-web
npm install
npm run dev
```

Open http://localhost:5173

**Build for production:**
```bash
npm run build
```

### Pages & routing

| Route        | Page           | Access        |
|--------------|----------------|---------------|
| `/login`     | Login          | Public        |
| `/dashboard` | Dashboard      | All users     |
| `/sensors`   | Sensor data    | All users     |
| `/alerts`    | Alert feed     | All users     |
| `/admin`     | User management| Admin only    |
| `/logs`      | System logs    | Admin only    |

Standard users are redirected away from `/admin` and `/logs` by `<AdminRoute>`.

---

## Mobile app — quick start

```bash
cd sentinel-guard-mobile
npm install
npx expo start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

### Screens

| Tab      | Screen         |
|----------|----------------|
| Home     | Dashboard overview, live sensor charts, recent alerts |
| Sensors  | Live readings for Node 01 & 02, historical sparklines, node status |
| Alerts   | Filterable alert feed with ML classification badges |
| Profile  | User info, notification settings, security info, sign out |

---

## Swapping in Firebase

Both apps use an identical service layer pattern. When the backend is ready:

1. Open `src/services/index.js` in the relevant app
2. Set `const USE_MOCK = false`
3. Fill in the `// TODO:` lines with the real Firebase SDK calls

**No component code needs to change.** The mock and Firebase paths have identical return shapes.

### Firebase services needed

| Service            | Used for                                        |
|--------------------|-------------------------------------------------|
| Firebase Auth      | `signIn`, `signOut`, `getCurrentUser`           |
| Firestore          | `subscribeSensors`, `subscribeAlerts`, `getSensorHistory`, `getUsers` |
| Custom Claims      | RBAC role (`admin` / `standard`) on the JWT    |
| Cloud Functions    | `updateUserRole`, `isolateNode`, `resetHMACKeys`|
| FCM                | Push notifications (mobile)                     |

---

## Mock data

All mock data lives in `src/mock/index.js` in each project. You can edit it freely to test different states:

- Change `MOCK_USER.role` to `'standard'` to preview the restricted view
- Add alerts to `MOCK_ALERTS` to test the feed
- Change sensor `status` to `'warn'` to test threshold warnings

---

## RBAC

Roles are enforced in two places:

**Web:** `<AdminRoute>` in `src/components/layout/RouteGuards.jsx` wraps admin pages. The sidebar also conditionally renders the admin nav links based on `user.role`.

**Mobile:** Profile screen shows role badge. Admin-specific controls are not present in the mobile app (field use case = read-only monitoring + alerts).

---

## Tech stack

### Web
- Vite + React 18
- React Router v6
- Recharts (line + area charts)
- CSS custom properties (no Tailwind — plain dark-theme design system in `index.css`)

### Mobile
- Expo SDK 54
- Expo Router v4 (file-based routing)
- react-native-svg (sparkline charts — no heavy charting lib)
- React Native core components only (no UI library)

---

## Team

| Member   | Role                    |
|----------|-------------------------|
| Najath   | Frontend & Dashboard    |
| Akila    | Backend & Firebase      |
| Ravindu  | Security & Encryption   |
| Julian   | IoT & Hardware          |
| (ML member) | ML & Data Processing |
