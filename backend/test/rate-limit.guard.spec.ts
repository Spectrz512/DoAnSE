
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../src/auth/rate-limit.guard.js';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../src/auth/rate-limit.decorator.js';

describe('RateLimitGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createGuard = (options?: RateLimitOptions) => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(options),
    } as unknown as Reflector;

    return new RateLimitGuard(reflector);
  };

  const createContext = (ip = '127.0.0.1') => {
    const handler = vi.fn();
    const controller = class TestController {};

    const context = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          path: '/chatbot/messages',
          route: { path: '/messages' },
          socket: { remoteAddress: ip },
        }),
      }),
    } as unknown as ExecutionContext;

    return context;
  };

  it('allows requests when no rate limit is configured', () => {
    const guard = createGuard();

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows requests within the configured limit', () => {
    const guard = createGuard({ limit: 20, windowMs: 60_000 });
    const context = createContext();

    for (let i = 0; i < 20; i++) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('rejects the request exceeding the limit with HTTP 429', () => {
    const guard = createGuard({ limit: 20, windowMs: 60_000 });
    const context = createContext();

    for (let i = 0; i < 20; i++) {
      guard.canActivate(context);
    }

    try {
      guard.canActivate(context);
      throw new Error('Expected rate limit to reject the request');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('allows requests again after the time window expires', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const guard = createGuard({ limit: 1, windowMs: 60_000 });
    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);

    expect(() => guard.canActivate(context)).toThrow(HttpException);

    now.mockReturnValue(61_001);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('tracks rate limits separately for different IP addresses', () => {
    const guard = createGuard({ limit: 1, windowMs: 60_000 });

    expect(guard.canActivate(createContext('192.168.1.10'))).toBe(true);
    expect(guard.canActivate(createContext('192.168.1.20'))).toBe(true);

    expect(() =>
      guard.canActivate(createContext('192.168.1.10')),
    ).toThrow(HttpException);
  });
});
