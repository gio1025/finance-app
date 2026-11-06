# KuriPot

A calmer way to grow your money habits. KuriPot is a mobile-first personal finance app for tracking balances, income, expenses, and spending categories.

Built with [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction/).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Browser end-to-end tests

The Playwright tests cover guest entry, navigation, and the core transaction flow (add income and expense, search, filter, edit, and delete) on desktop and mobile Chromium. Install the browser once, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

By default, Playwright starts the local Expo web app. To run the same tests against the deployed site in PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://kuripot-finance.web.app"
npm run test:e2e
```

TypeScript is the recommended language for these tests: it matches the app, catches selector/configuration mistakes early, and is supported directly by Playwright.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Supabase setup

KuriPot uses Supabase Auth for email/password accounts and PostgreSQL for each
account's budget entries, categories, saved descriptions, and currency preference. To connect a
project:

1. Create a Supabase project and copy its Project URL and publishable API key.
   The app only needs the publishable key (or the legacy anon key); never put a
   `service_role` key in a mobile app.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Run the SQL files in `supabase/migrations/` in filename order in the
   Supabase SQL Editor. The second migration adds cloud storage for recurring
   transactions, the third adds reusable saved descriptions, and the fourth
   separates saved descriptions by income or expense. Existing descriptions
   are kept available to both transaction types.
4. In Supabase Authentication URL Configuration, allow the app's confirmation
   and password-recovery redirects: `kuripot://auth/callback` and
   `kuripot://update-password`. Add the Expo Go development redirect shown by
   your local Expo environment when testing there.
5. Restart Expo so it loads the environment variables:

   ```bash
   npx expo start -c
   ```

Email confirmation may be enabled in Supabase Auth; when enabled, new accounts
must confirm their email before logging in. Apple and Google buttons remain
unavailable until those providers are configured.

Budget changes are saved on-device first. The Settings screen shows whether
cloud sync is active and lets you refresh from Supabase or retry after a failed
request; cloud records take priority when both cloud and local copies exist,
while local-only records are preserved during the merge.

Recurring transactions are added to history when the app opens or returns to
the foreground. Mobile operating systems may pause the app in the background,
so due entries are not generated while the app is closed. New schedules can be
set up while adding a transaction or from Settings; existing schedules can be
edited or stopped there.
