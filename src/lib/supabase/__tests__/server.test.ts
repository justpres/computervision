import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient as createServerClient } from '../server';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([{ name: 'sb-auth', value: 'token-123' }]),
    set: vi.fn(),
  }),
}));

describe('Supabase Server Client Setup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error if NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    await expect(createServerClient()).rejects.toThrowError(
      /Missing Supabase environment variables/
    );
  });

  it('throws an error if both ANON_KEY and PUBLISHABLE_KEY are missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    await expect(createServerClient()).rejects.toThrowError(
      /Missing Supabase environment variables/
    );
  });

  it('creates server client when NEXT_PUBLIC_SUPABASE_ANON_KEY is provided', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const client = await createServerClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('creates server client when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is provided', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    const client = await createServerClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('trims whitespace from environment variable keys', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://test-project.supabase.co  ';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '  sb_publishable_test_key  ';

    const client = await createServerClient();
    expect(client).toBeDefined();
  });
});
