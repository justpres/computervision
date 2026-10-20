import { describe, it, expect } from 'vitest';
import nextConfig, { securityHeaders } from '../../../next.config';

describe('Security Headers Configuration', () => {
  it('defines headers function on nextConfig', async () => {
    expect(nextConfig.headers).toBeDefined();
    const headersList = await nextConfig.headers!();
    expect(headersList).toHaveLength(1);
    expect(headersList[0].source).toBe('/(.*)');
  });

  it('configures Permissions-Policy: camera=(self)', () => {
    const header = securityHeaders.find((h) => h.key === 'Permissions-Policy');
    expect(header).toBeDefined();
    expect(header?.value).toBe('camera=(self)');
  });

  it('configures X-Frame-Options: DENY', () => {
    const header = securityHeaders.find((h) => h.key === 'X-Frame-Options');
    expect(header).toBeDefined();
    expect(header?.value).toBe('DENY');
  });

  it('configures X-Content-Type-Options: nosniff', () => {
    const header = securityHeaders.find((h) => h.key === 'X-Content-Type-Options');
    expect(header).toBeDefined();
    expect(header?.value).toBe('nosniff');
  });

  it('configures Referrer-Policy: strict-origin-when-cross-origin', () => {
    const header = securityHeaders.find((h) => h.key === 'Referrer-Policy');
    expect(header).toBeDefined();
    expect(header?.value).toBe('strict-origin-when-cross-origin');
  });

  it('configures Strict-Transport-Security with preload', () => {
    const header = securityHeaders.find((h) => h.key === 'Strict-Transport-Security');
    expect(header).toBeDefined();
    expect(header?.value).toBe('max-age=63072000; includeSubDomains; preload');
  });

  it('configures Content-Security-Policy-Report-Only with all required directives', () => {
    const header = securityHeaders.find(
      (h) => h.key === 'Content-Security-Policy-Report-Only'
    );
    expect(header).toBeDefined();
    const cspValue = header?.value || '';

    expect(cspValue).toContain("default-src 'self'");
    expect(cspValue).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:");
    expect(cspValue).toContain("style-src 'self' 'unsafe-inline'");
    expect(cspValue).toContain("font-src 'self' data:");
    expect(cspValue).toContain("img-src 'self' blob: data:");
    expect(cspValue).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(cspValue).toContain("worker-src 'self' blob:");
    expect(cspValue).toContain("object-src 'none'");
    expect(cspValue).toContain("frame-ancestors 'none'");
  });

  describe('Vercel Static Caching Configuration (vercel.json)', () => {
    it('verifies immutable caching for mediapipe and models', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const vercelJsonPath = path.resolve(__dirname, '../../../vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      expect(vercelConfig.headers).toBeDefined();
      expect(vercelConfig.headers).toHaveLength(2);

      const mediapipeRule = vercelConfig.headers.find(
        (r: { source: string }) => r.source === '/mediapipe/(.*)'
      );
      expect(mediapipeRule).toBeDefined();
      const mediapipeCache = mediapipeRule.headers.find(
        (h: { key: string }) => h.key === 'Cache-Control'
      );
      expect(mediapipeCache?.value).toBe('public, max-age=31536000, immutable');

      const modelsRule = vercelConfig.headers.find(
        (r: { source: string }) => r.source === '/models/(.*)'
      );
      expect(modelsRule).toBeDefined();
      const modelsCache = modelsRule.headers.find(
        (h: { key: string }) => h.key === 'Cache-Control'
      );
      expect(modelsCache?.value).toBe('public, max-age=31536000, immutable');
    });
  });
});
