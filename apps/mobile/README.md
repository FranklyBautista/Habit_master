# Constancia — app móvil (Expo)

Parte del workspace pnpm de `habit_tracker`; ver el `CLAUDE.md` de la raíz del
repositorio para las convenciones generales. Scaffolded con
[`create-expo-app`](https://www.npmjs.com/package/create-expo-app), Expo SDK 57.

## Empezar

1. Instala dependencias desde la raíz del repo (no dentro de `apps/mobile`):

   ```bash
   pnpm install
   ```

2. Con Supabase local activo (`pnpm supabase:start` desde la raíz), exporta las
   variables que este app lee (prefijo `EXPO_PUBLIC_*`, ver
   `src/lib/supabase/env.ts`). Para probar desde un emulador/dispositivo físico
   usa la IP LAN de tu máquina, no `localhost` — el dispositivo no puede
   resolver `localhost` como tu propia laptop:

   ```bash
   export EXPO_PUBLIC_SUPABASE_URL="http://<tu-ip-lan>:54321"
   export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable key de `supabase status`>"
   ```

3. Inicia la app

   ```bash
   pnpm start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
