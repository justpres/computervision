import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

describe('Feature F-21: Handover Readiness & Self-Hosted Assets', () => {
  it('verifies required self-hosted MediaPipe model and WASM binaries exist under public/', () => {
    const requiredAssets = [
      'public/models/face_landmarker.task',
      'public/mediapipe/vision_wasm_internal.js',
      'public/mediapipe/vision_wasm_internal.wasm',
      'public/mediapipe/vision_wasm_nosimd_internal.js',
      'public/mediapipe/vision_wasm_nosimd_internal.wasm',
    ];

    for (const relPath of requiredAssets) {
      const fullPath = path.join(ROOT_DIR, relPath);
      expect(fs.existsSync(fullPath), `Missing asset: ${relPath}`).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(0);
    }
  });

  it('verifies .env.example and Supabase RLS migration file exist and contain no real secrets', () => {
    const envExamplePath = path.join(ROOT_DIR, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_URL=');
    expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=');
    expect(envContent).not.toMatch(/service_role/i);

    const migrationPath = path.join(
      ROOT_DIR,
      'supabase/migrations/20261115000000_create_sessions_and_events.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('enable row level security');
    expect(sqlContent).toContain('(select auth.uid()) = user_id');
  });

  it('verifies all dependencies and devDependencies in package.json are pinned to exact versions', () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    for (const [name, version] of Object.entries(allDeps)) {
      expect(version, `Unpinned version for ${name}: ${version}`).not.toMatch(
        /^(\^|~|latest|\*)/
      );
    }

    expect(pkg.scripts).toMatchObject({
      dev: expect.any(String),
      lint: expect.any(String),
      typecheck: expect.any(String),
      test: expect.any(String),
      build: expect.any(String),
    });
  });
});
