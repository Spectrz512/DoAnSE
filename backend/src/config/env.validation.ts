function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = asString(config.NODE_ENV, 'development');
  const databaseUrl = asString(config.DATABASE_URL);
  const corsOrigins = asString(config.CORS_ORIGINS).trim();

  if (nodeEnv === 'production') {
    if (!databaseUrl) throw new Error('DATABASE_URL is required in production');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    CORS_ORIGINS: corsOrigins,
  };
}
