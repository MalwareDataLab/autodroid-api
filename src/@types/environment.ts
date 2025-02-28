/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // General
      APP_URL: string;
      APP_PORT: string;
      NODE_ENV: string;
      DEFAULT_LANGUAGE: string;
      TZ?: string;
      DEBUG: string;

      // Cors
      CORS_ALLOWED_FROM: string;

      // Database
      DATABASE_URL: string;
      DATABASE_LOGGER_ENABLED: string;

      // Non-relational database
      NON_RELATIONAL_DATABASE_URL: string;
      NON_RELATIONAL_DATABASE_LOGGER_ENABLED: string;

      // Redis
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USER?: string;
      REDIS_PASS?: string;
      REDIS_DB?: string;

      // Providers
      FIREBASE_AUTHENTICATION_PROVIDER_PROJECT_ID: string;
      FIREBASE_AUTHENTICATION_PROVIDER_CLIENT_EMAIL: string;
      FIREBASE_AUTHENTICATION_PROVIDER_PRIVATE_KEY: string;

      GOOGLE_STORAGE_PROVIDER_PROJECT_ID: string;
      GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL: string;
      GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY: string;
      GOOGLE_STORAGE_PROVIDER_BUCKET_NAME: string;

      NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_USER: string;
      NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_APP_PASSWORD: string;

      // Feature
      SENTRY_DSN: string;

      EMAIL_NOTIFICATION_PROVIDER_EMAIL_OVERRIDE_TO_EMAILS: string;
      EMAIL_NOTIFICATION_PROVIDER_EMAIL_DEFAULT_BCC_EMAILS: string;

      ADMIN_EMAILS: string;

      JOBS_ENABLED: string;

      FRONTEND_URL: string;

      STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: string;
      STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: string;

      WORKER_REFRESH_TOKEN_SECRET: string;
      WORKER_REFRESH_TOKEN_EXPIRATION: string;
      WORKER_ACCESS_TOKEN_SECRET: string;
      WORKER_ACCESS_TOKEN_EXPIRATION: string;

      PROCESSING_DEFAULT_KEEP_UNTIL: string;
      PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: string;
    }
  }
}

export {};
