import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { requireAnyDeviceSession, requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';
import {
  deleteApplianceManual,
  getApplianceManualById,
  insertApplianceManual,
  listApplianceManuals,
  nextSortOrder,
  requireApplianceManualsDb,
  updateApplianceManual
} from '../applianceManuals/repository.js';
import {
  generateObjectKey,
  getApplianceGuideObject,
  putApplianceGuideObject,
  requireApplianceGuidesBucket,
  safeDeleteApplianceGuideObject
} from '../applianceManuals/r2Storage.js';
import { toPublicManual } from '../applianceManuals/serialize.js';
import {
  parsePublishedFlag,
  parseSortOrder,
  sanitizeCategory,
  sanitizeOptionalText,
  sanitizeOriginalFilename,
  sanitizeRequiredText
} from '../applianceManuals/sanitize.js';
import { validatePdfUpload } from '../applianceManuals/validatePdf.js';

/**
 * @param {Request} request
 * @param {URL} url
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleApplianceManuals(request, url, env, correlationId) {
  const basePath = '/api/appliance-manuals';
  if (!url.pathname.startsWith(basePath)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }

  const remainder = url.pathname.slice(basePath.length);
  const segments = remainder.split('/').filter(Boolean);

  try {
    if (segments.length === 0) {
      if (request.method === 'GET') return listManuals(request, env, correlationId);
      if (request.method === 'POST') return createManual(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }

    const [id, action] = segments;
    if (!id) return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });

    if (action === 'file') {
      if (segments.length !== 2) return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
      if (request.method === 'GET') return streamManualFile(request, env, id, correlationId);
      if (request.method === 'PUT') return replaceManualFile(request, env, id, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments.length !== 1) {
      return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
    }

    if (request.method === 'GET') return getManual(request, env, id, correlationId);
    if (request.method === 'PATCH') return patchManual(request, env, id, correlationId);
    if (request.method === 'DELETE') return removeManual(request, env, id, correlationId);
    return methodNotAllowed(correlationId);
  } catch (error) {
    if (error?.code === 'APPLIANCE_MANUALS_NOT_CONFIGURED' || error?.code === 'APPLIANCE_GUIDES_NOT_CONFIGURED') {
      return jsonError(503, 'SERVICE_UNAVAILABLE', 'Appliance manuals are temporarily unavailable.', {
        correlationId
      });
    }
    throw error;
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function listManuals(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);

  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const rows = await listApplianceManuals(db, { publishedOnly: !ownerGate.ok });
  return Response.json(
    { manuals: rows.map(toPublicManual) },
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function getManual(request, env, id, correlationId) {
  const access = await resolveManualReadAccess(request, env, id, correlationId);
  if (!access.ok) return access.response;

  return Response.json(toPublicManual(access.manual), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function createManual(request, env, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, 'Forbidden.', { correlationId });
  }

  const form = await request.formData();
  const metadata = parseMetadataFromForm(form);
  if (!metadata.ok) {
    return jsonError(400, 'VALIDATION_ERROR', metadata.message, { correlationId });
  }

  const fileEntry = form.get('file');
  const validated = await validatePdfUpload(
    fileEntry instanceof File ? fileEntry : /** @type {File | null} */ (null)
  );
  if (!validated.ok) {
    return jsonError(400, 'VALIDATION_ERROR', validated.message, { correlationId });
  }

  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const objectKey = generateObjectKey();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const sortOrder = (await nextSortOrder(db)) ?? 0;

  await putApplianceGuideObject(bucket, objectKey, validated.buffer, validated.mimeType);

  try {
    const created = await insertApplianceManual(db, {
      id,
      ...metadata.value,
      objectKey,
      originalFilename: sanitizeOriginalFilename(validated.filename),
      mimeType: validated.mimeType,
      fileSize: validated.size,
      sortOrder,
      createdAt: now,
      updatedAt: now
    });
    return Response.json(toPublicManual(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    await safeDeleteApplianceGuideObject(bucket, objectKey);
    throw error;
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function patchManual(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, 'Forbidden.', { correlationId });
  }

  /** @type {Record<string, unknown>} */
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request body.', { correlationId });
  }

  if (body.objectKey != null || body.object_key != null) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request body.', { correlationId });
  }

  const patch = parseMetadataPatch(body);
  if (!patch.ok) {
    return jsonError(400, 'VALIDATION_ERROR', patch.message, { correlationId });
  }

  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const updated = await updateApplianceManual(db, id, {
    ...patch.value,
    updatedAt: new Date().toISOString()
  });
  if (!updated) {
    return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
  }

  return Response.json(toPublicManual(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function replaceManualFile(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, 'Forbidden.', { correlationId });
  }

  const form = await request.formData();
  if (form.get('objectKey') != null || form.get('object_key') != null) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request body.', { correlationId });
  }

  const fileEntry = form.get('file');
  const validated = await validatePdfUpload(
    fileEntry instanceof File ? fileEntry : /** @type {File | null} */ (null)
  );
  if (!validated.ok) {
    return jsonError(400, 'VALIDATION_ERROR', validated.message, { correlationId });
  }

  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const existing = await getApplianceManualById(db, id);
  if (!existing) {
    return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
  }

  const nextObjectKey = generateObjectKey();
  await putApplianceGuideObject(bucket, nextObjectKey, validated.buffer, validated.mimeType);

  try {
    const updated = await updateApplianceManual(db, id, {
      objectKey: nextObjectKey,
      originalFilename: sanitizeOriginalFilename(validated.filename),
      mimeType: validated.mimeType,
      fileSize: validated.size,
      updatedAt: new Date().toISOString()
    });
    if (!updated) {
      await safeDeleteApplianceGuideObject(bucket, nextObjectKey);
      return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
    }
    await safeDeleteApplianceGuideObject(bucket, existing.object_key);
    return Response.json(toPublicManual(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    await safeDeleteApplianceGuideObject(bucket, nextObjectKey);
    throw error;
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function removeManual(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, 'Forbidden.', { correlationId });
  }

  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const removed = await deleteApplianceManual(db, id);
  if (!removed) {
    return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
  }

  await safeDeleteApplianceGuideObject(bucket, removed.object_key);
  return new Response(null, { status: 204 });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function streamManualFile(request, env, id, correlationId) {
  const access = await resolveManualReadAccess(request, env, id, correlationId);
  if (!access.ok) return access.response;

  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const object = await getApplianceGuideObject(bucket, access.manual.object_key);
  if (!object) {
    return jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId });
  }

  const filename = sanitizeOriginalFilename(access.manual.original_filename);
  const encoded = encodeRFC5987Filename(filename);
  const headers = new Headers({
    'Content-Type': access.manual.mime_type || 'application/pdf',
    'Content-Disposition': `inline; filename="${escapeFilename(filename)}"; filename*=UTF-8''${encoded}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store'
  });

  return new Response(object.body, { status: 200, headers });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} id
 * @param {string} correlationId
 */
async function resolveManualReadAccess(request, env, id, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const manual = await getApplianceManualById(db, id);

  if (!manual) {
    return { ok: false, response: jsonError(404, 'NOT_FOUND', 'Manual not found.', { correlationId }) };
  }

  if (ownerGate.ok) {
    return { ok: true, manual };
  }

  const sitterGate = await requireAnyDeviceSession(request, env);
  if (!sitterGate.ok) {
    return {
      ok: false,
      response: jsonError(sitterGate.status, sitterGate.code, 'Forbidden.', { correlationId })
    };
  }

  if (manual.published !== 1) {
    return { ok: false, response: jsonError(403, 'FORBIDDEN', 'Forbidden.', { correlationId }) };
  }

  return { ok: true, manual };
}

/**
 * @param {FormData} form
 */
function parseMetadataFromForm(form) {
  const title = sanitizeRequiredText(form.get('title'), 'title');
  if (!title.ok) return title;
  const applianceName = sanitizeRequiredText(form.get('applianceName') ?? form.get('appliance_name'), 'applianceName');
  if (!applianceName.ok) return applianceName;
  const category = sanitizeCategory(form.get('category'));
  if (!category.ok) return category;

  const sortOrder = parseSortOrder(form.get('sortOrder') ?? form.get('sort_order'));

  return {
    ok: true,
    value: {
      title: title.value,
      applianceName: applianceName.value,
      manufacturer: sanitizeOptionalText(form.get('manufacturer'), 120),
      model: sanitizeOptionalText(form.get('model'), 120),
      category: category.value,
      location: sanitizeOptionalText(form.get('location'), 200),
      description: sanitizeOptionalText(form.get('description'), 2000),
      published: parsePublishedFlag(form.get('published')),
      ...(sortOrder != null ? { sortOrder } : {})
    }
  };
}

/**
 * @param {Record<string, unknown>} body
 */
function parseMetadataPatch(body) {
  /** @type {Record<string, unknown>} */
  const patch = {};

  if (body.title !== undefined) {
    const title = sanitizeRequiredText(body.title, 'title');
    if (!title.ok) return title;
    patch.title = title.value;
  }
  if (body.applianceName !== undefined || body.appliance_name !== undefined) {
    const applianceName = sanitizeRequiredText(body.applianceName ?? body.appliance_name, 'applianceName');
    if (!applianceName.ok) return applianceName;
    patch.applianceName = applianceName.value;
  }
  if (body.category !== undefined) {
    const category = sanitizeCategory(body.category);
    if (!category.ok) return category;
    patch.category = category.value;
  }
  if (body.manufacturer !== undefined) {
    patch.manufacturer = sanitizeOptionalText(body.manufacturer, 120);
  }
  if (body.model !== undefined) {
    patch.model = sanitizeOptionalText(body.model, 120);
  }
  if (body.location !== undefined) {
    patch.location = sanitizeOptionalText(body.location, 200);
  }
  if (body.description !== undefined) {
    patch.description = sanitizeOptionalText(body.description, 2000);
  }
  if (body.published !== undefined) {
    patch.published = parsePublishedFlag(body.published);
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    const sortOrder = parseSortOrder(body.sortOrder ?? body.sort_order);
    if (sortOrder == null) {
      return { ok: false, message: 'Invalid sort order.' };
    }
    patch.sortOrder = sortOrder;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: 'No changes provided.' };
  }

  return { ok: true, value: patch };
}

/**
 * @param {string} filename
 */
function escapeFilename(filename) {
  return filename.replace(/["\\]/g, '_');
}

/**
 * @param {string} filename
 */
function encodeRFC5987Filename(filename) {
  return encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
