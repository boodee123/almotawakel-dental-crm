# almotawakel-dental-crm

## Firebase configuration

The Vite entry point is `src/main.jsx`. Its Firebase initialization module,
`src/firebase.js`, must remain in the repository; it reads configuration from
environment variables rather than storing project-specific values in source.
The root-level `firebase.js` re-exports that module for compatibility.

For local development, copy `.env.example` to `.env.local` and fill in your
Firebase Web App configuration. Restart the development server after changing
environment variables. Local environment files are ignored by Git.

For Netlify, set the following variables in the site's environment settings,
make them available to builds for the deployment contexts you use, and redeploy:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET` (optional for the current app)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (optional for the current app)

Keep the build command as `npm run build` and the publish directory as `dist`.
If a required value is missing, empty, or still an `ADD_` placeholder, the app
shows its setup screen instead of initializing Firebase with incomplete values.

Vite includes `VITE_*` variables in browser code, so use these only for Firebase
Web App configuration, never for service-account credentials or other secrets.
Access to data must be protected by Firebase Authentication and Firestore rules.

See `README_AR.md` for the application setup instructions in Arabic.
