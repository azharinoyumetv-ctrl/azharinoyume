interface CloudflareEnv {
  ASSETS: Fetcher;
  HYPERDRIVE?: {
    connectionString: string;
  };
  NEXT_PUBLIC_APP_URL: string;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET?: string;
  DATABASE_URL?: string;
  ORIGIN_SERVICE_URL?: string;
  ORIGIN_SERVICE_SECRET?: string;
  [key: string]: unknown;
}
