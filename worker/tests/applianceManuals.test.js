import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../src/index.js';
import { validatePdfUpload, hasPdfMagicBytes } from '../src/applianceManuals/validatePdf.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withDeviceSessionCookie
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';
import {
  createInMemoryApplianceManualsDb,
  createInMemoryR2Bucket,
  createTestPdfFile,
  MINIMAL_PDF_BYTES
} from './mocks/applianceManualsStorage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePdf = readFileSync(join(__dirname, 'fixtures/sample-manual.pdf'));

function createEnv(overrides = {}) {
  return withTestLimiters(
    createAccessTestEnv({
      APPLIANCE_MANUALS_DB: createInMemoryApplianceManualsDb(),
      APPLIANCE_GUIDES: createInMemoryR2Bucket(),
      ...overrides
    })
  );
}

/**
 * @param {Record<string, unknown>} env
 * @param {'owner' | 'sitter'} mode
 * @param {string} email
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function authedRequest(env, mode, email, url, init = {}) {
  const jwt = await signTestAccessJwt(email, env);
  const headers = new Headers(init.headers);
  headers.set('Cf-Access-Jwt-Assertion', jwt);
  const cookieInit = await withDeviceSessionCookie(jwt, env, mode, Math.floor(Date.now() / 1000), {
    ...init,
    headers
  });
  const cookieHeaders = new Headers(cookieInit.headers);
  if (init.body instanceof FormData) {
    cookieHeaders.delete('Content-Type');
  }
  return handleRequest(
    new Request(url, {
      ...cookieInit,
      headers: cookieHeaders
    }),
    env
  );
}

/**
 * @param {Record<string, unknown>} [overrides]
 */
function buildCreateForm(overrides = {}) {
  const form = new FormData();
  form.set('title', overrides.title ?? 'Dishwasher user guide');
  form.set('applianceName', overrides.applianceName ?? 'Dishwasher');
  form.set('category', overrides.category ?? 'Kitchen');
  form.set('published', overrides.published ?? 'true');
  form.set('file', overrides.file ?? createTestPdfFile());
  if (overrides.objectKey) form.set('objectKey', String(overrides.objectKey));
  return form;
}

describe('appliance manual PDF validation', () => {
  it('accepts a valid PDF fixture', async () => {
    const file = new File([fixturePdf], 'valid.pdf', { type: 'application/pdf' });
    const result = await validatePdfUpload(file);
    expect(result.ok).toBe(true);
  });

  it('rejects non-PDF extension', async () => {
    const file = new File([MINIMAL_PDF_BYTES], 'notes.txt', { type: 'application/pdf' });
    const result = await validatePdfUpload(file);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Please select a PDF file.');
  });

  it('rejects incorrect MIME type', async () => {
    const file = new File([MINIMAL_PDF_BYTES], 'manual.pdf', { type: 'text/plain' });
    const result = await validatePdfUpload(file);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid PDF signature', async () => {
    const file = new File([new Uint8Array([0x00, 0x01, 0x02])], 'manual.pdf', {
      type: 'application/pdf'
    });
    const result = await validatePdfUpload(file);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('The uploaded file is not a valid PDF.');
  });

  it('rejects oversized uploads', async () => {
    const big = new Uint8Array(15 * 1024 * 1024 + 1);
    big.set(MINIMAL_PDF_BYTES, 0);
    const file = new File([big], 'big.pdf', { type: 'application/pdf' });
    const result = await validatePdfUpload(file);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('The PDF must be smaller than 15 MB.');
  });

  it('detects PDF magic bytes', () => {
    expect(hasPdfMagicBytes(MINIMAL_PDF_BYTES)).toBe(true);
  });
});

describe('appliance manuals API authorization and lifecycle', () => {
  it('owner can upload a valid PDF', async () => {
    const env = createEnv();
    const response = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm() }
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.applianceName).toBe('Dishwasher');
    expect(body.published).toBe(true);
    expect(body).not.toHaveProperty('objectKey');
    expect(body).not.toHaveProperty('object_key');
  });

  it('sitter cannot upload', async () => {
    const env = createEnv();
    const response = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm() }
    );
    expect(response.status).toBe(403);
  });

  it('owner with sitter device session cannot manage manuals', async () => {
    const env = createEnv();
    const response = await authedRequest(
      env,
      'sitter',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm() }
    );
    expect(response.status).toBe(403);
  });

  it('sitter cannot edit, replace, publish, hide or delete', async () => {
    const env = createEnv();
    const created = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm({ published: 'false' }) }
    );
    const manual = await created.json();

    const patch = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true })
      }
    );
    expect(patch.status).toBe(403);

    const replaceForm = new FormData();
    replaceForm.set('file', createTestPdfFile('replacement.pdf'));
    const replace = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}/file`,
      { method: 'PUT', body: replaceForm }
    );
    expect(replace.status).toBe(403);

    const del = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`,
      { method: 'DELETE' }
    );
    expect(del.status).toBe(403);
  });

  it('valid sitter session lists published manuals only', async () => {
    const env = createEnv();
    await authedRequest(env, 'owner', 'owner@example.com', 'https://worker.test/api/appliance-manuals', {
      method: 'POST',
      body: buildCreateForm({ title: 'Published guide', applianceName: 'Washer', published: 'true' })
    });
    await authedRequest(env, 'owner', 'owner@example.com', 'https://worker.test/api/appliance-manuals', {
      method: 'POST',
      body: buildCreateForm({ title: 'Hidden guide', applianceName: 'Dryer', published: 'false' })
    });

    const response = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      'https://worker.test/api/appliance-manuals'
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.manuals).toHaveLength(1);
    expect(body.manuals[0].applianceName).toBe('Washer');
  });

  it('sitter can view a published PDF but not an unpublished manual', async () => {
    const env = createEnv();
    const created = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm({ published: 'false' }) }
    );
    const manual = await created.json();

    const hiddenMeta = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`
    );
    expect(hiddenMeta.status).toBe(403);

    const hiddenFile = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}/file`
    );
    expect(hiddenFile.status).toBe(403);

    await authedRequest(
      env,
      'owner',
      'owner@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true })
      }
    );

    const file = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}/file`
    );
    expect(file.status).toBe(200);
    expect(file.headers.get('Content-Type')).toBe('application/pdf');
    expect(file.headers.get('Content-Disposition')).toContain('inline');
    expect(file.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(file.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('unknown manual returns 404', async () => {
    const env = createEnv();
    const response = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      'https://worker.test/api/appliance-manuals/does-not-exist'
    );
    expect(response.status).toBe(404);
  });

  it('ignores client-supplied object keys on create', async () => {
    const env = createEnv();
    const bucket = env.APPLIANCE_GUIDES;
    const response = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm({ objectKey: 'guides/evil.pdf' }) }
    );
    expect(response.status).toBe(201);
    expect(bucket.objects.has('guides/evil.pdf')).toBe(false);
    expect([...bucket.objects.keys()].some((key) => key.startsWith('guides/'))).toBe(true);
  });

  it('deleting a manual removes metadata and stored file', async () => {
    const env = createEnv();
    const bucket = env.APPLIANCE_GUIDES;
    const created = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm() }
    );
    const manual = await created.json();
    const objectCountBefore = bucket.objects.size;

    const del = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`,
      { method: 'DELETE' }
    );
    expect(del.status).toBe(204);

    const list = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals'
    );
    const body = await list.json();
    expect(body.manuals).toHaveLength(0);
    expect(bucket.objects.size).toBe(objectCountBefore - 1);
  });

  it('replacing a PDF keeps the manual usable', async () => {
    const env = createEnv();
    const created = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm({ published: 'true' }) }
    );
    const manual = await created.json();

    const replaceForm = new FormData();
    replaceForm.set('file', createTestPdfFile('updated.pdf'));
    const replaced = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}/file`,
      { method: 'PUT', body: replaceForm }
    );
    expect(replaced.status).toBe(200);

    const file = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}/file`
    );
    expect(file.status).toBe(200);
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect(hasPdfMagicBytes(bytes)).toBe(true);
  });

  it('ignores frontend-supplied mode or role in JSON patch', async () => {
    const env = createEnv();
    const created = await authedRequest(
      env,
      'owner',
      'owner@example.com',
      'https://worker.test/api/appliance-manuals',
      { method: 'POST', body: buildCreateForm({ published: 'false' }) }
    );
    const manual = await created.json();

    const patch = await authedRequest(
      env,
      'sitter',
      'sitter@example.com',
      `https://worker.test/api/appliance-manuals/${manual.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true, mode: 'owner', role: 'owner' })
      }
    );
    expect(patch.status).toBe(403);
  });
});
