function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = asString(config.NODE_ENV, 'development');
  const jwtSecret = asString(config.JWT_SECRET);
  const databaseUrl = asString(config.DATABASE_URL);
  const corsOrigins = asString(config.CORS_ORIGINS).trim();

  if (nodeEnv === 'production') {
    if (!databaseUrl) throw new Error('DATABASE_URL is required in production');
    if (jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters in production');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret || 'dev-secret-change-me',
    DATABASE_URL: databaseUrl,
    CORS_ORIGINS: corsOrigins,
  };
}