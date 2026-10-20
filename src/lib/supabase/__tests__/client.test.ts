import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient as createBrowserClient } from '../client';

describe('Supabase Client Setup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => createBrowserClient()).toThrowError(
      /Missing Supabase environment variables/
    );
  });

  it('throws an error if both ANON_KEY and PUBLISHABLE_KEY are missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => createBrowserClient()).toThrowError(
      /Missing Supabase environment variables/
    );
  });

  it('creates browser client when NEXT_PUBLIC_SUPABASE_ANON_KEY is provided', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('creates browser client when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is provided', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('trims whitespace from environment variable values', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://test-project.supabase.co  ';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '  sb_publishable_test_key  ';

    const client = createBrowserClient();
    expect(client).toBeDefined();
  });
});
