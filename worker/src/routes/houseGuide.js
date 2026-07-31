import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { requireAnyDeviceSession, requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';
import { loadAssembledGuideCatalog, toPublicGuideMedia, toPublicGuideTopic } from '../houseGuide/assembleCatalog.js';
import {
  createGuideTopic,
  countDraftGuideTopics,
  deleteGuideMedia,
  deleteGuideTopic,
  getGuideMediaById,
  getGuideTopicById,
  importGuideCatalog,
  insertGuideMedia,
  isHouseGuideSeeded,
  listGuideMedia,
  publishAllGuideTopics,
  publishGuideTopic,
  reorderGuideTopicsInCategory,
  requireHouseGuideDb,
  updateGuideSettings,
  updateGuideTopic
} from '../houseGuide/repository.js';
import {
  generateGuideMediaObjectKey,
  getGuideMediaObject,
  putGuideMediaObject,
  requireGuideMediaBucket,
  safeDeleteGuideMediaObject
} from '../houseGuide/r2Storage.js';
import {
  sanitizeBlocks,
  sanitizeAudience,
  sanitizeGuideActions,
  sanitizeMediaId,
  sanitizeOriginalFilename,
  sanitizeRequiredText,
  sanitizeStringArray
} from '../houseGuide/sanitize.js';
import { validateGuideImageBuffer, validateGuideImageUpload } from '../houseGuide/validateImage.js';

/**
 * @param {Request} request
 * @param {URL} url
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleHouseGuide(request, url, env, correlationId) {
  const basePath = '/api/house-guide';
  if (!url.pathname.startsWith(basePath)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }

  const remainder = url.pathname.slice(basePath.length);
  const segments = remainder.split('/').filter(Boolean);

  try {
    if (segments.length === 0) {
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'catalog') {
      if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
      if (request.method === 'GET') return getCatalog(request, env, url, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'import') {
      if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
      if (request.method === 'POST') return importCatalog(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'publish-all') {
      if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
      if (request.method === 'POST') return publishAll(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'settings') {
      if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
      if (request.method === 'PATCH') return patchSettings(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'categories') {
      const categoryId = segments[1];
      const action = segments[2];
      if (action === 'reorder-topics') {
        if (segments.length !== 3 || !categoryId) {
          return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
        }
        if (request.method === 'POST') return reorderTopics(request, env, categoryId, correlationId);
        return methodNotAllowed(correlationId);
      }
      return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
    }

    if (segments[0] === 'topics') {
      const topicId = segments[1];
      const action = segments[2];
      if (!topicId) {
        if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
        if (request.method === 'POST') return createTopic(request, env, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (action === 'publish') {
        if (segments.length !== 3) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });
        if (request.method === 'POST') return publishTopic(request, env, topicId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length !== 2) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });
      if (request.method === 'GET') return getTopic(request, env, topicId, correlationId);
      if (request.method === 'PATCH') return patchTopic(request, env, topicId, correlationId);
      if (request.method === 'DELETE') return removeTopic(request, env, topicId, correlationId);
      return methodNotAllowed(correlationId);
    }

    if (segments[0] === 'media') {
      const mediaId = segments[1];
      const action = segments[2];
      if (action === 'file') {
        if (segments.length !== 3 || !mediaId) {
          return jsonError(404, 'NOT_FOUND', 'Media not found.', { correlationId });
        }
        if (request.method === 'GET') return streamMediaFile(request, env, mediaId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length === 2 && mediaId) {
        if (request.method === 'DELETE') return removeMedia(request, env, mediaId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length !== 1) return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
      if (request.method === 'GET') return listMedia(request, env, correlationId);
      if (request.method === 'POST') return uploadMedia(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }

    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  } catch (error) {
    if (error?.code === 'HOUSE_GUIDE_NOT_CONFIGURED' || error?.code === 'GUIDE_MEDIA_NOT_CONFIGURED') {
      return jsonError(503, 'SERVICE_UNAVAILABLE', 'House guide content is temporarily unavailable.', {
        correlationId
      });
    }
    throw error;
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {URL} url
 * @param {string} correlationId
 */
async function getCatalog(request, env, url, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);

  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  if (!seeded) {
    return Response.json(
      { seeded: false, catalog: null },
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }

  const includeDraft = ownerGate.ok && url.searchParams.get('draft') === '1';
  const catalog = await loadAssembledGuideCatalog(db, {
    publishedOnly: !ownerGate.ok,
    includeDraftBlocks: includeDraft
  });

  return Response.json(
    {
      seeded: true,
      catalog,
      draftCount: catalog?.draftCount ?? 0
    },
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function importCatalog(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  if (!body?.catalog || !Array.isArray(body.catalog.categories)) {
    return jsonError(400, 'BAD_REQUEST', 'Expected { catalog: GuideCatalog }.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await importGuideCatalog(db, body.catalog);

  const catalog = await loadAssembledGuideCatalog(db, { includeDraftBlocks: true });
  return Response.json({ ok: true, catalog }, { status: 201, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} topicId
 * @param {string} correlationId
 */
async function getTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const row = await getGuideTopicById(db, topicId);
  if (!row) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });

  return Response.json(toPublicGuideTopic(row), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} topicId
 * @param {string} correlationId
 */
async function patchTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const title = body.title !== undefined ? sanitizeRequiredText(body.title, 120) : undefined;
  if (body.title !== undefined && !title) {
    return jsonError(400, 'BAD_REQUEST', 'Title is required.', { correlationId });
  }

  const blocks = body.blocks !== undefined ? sanitizeBlocks(body.blocks) : undefined;
  if (body.blocks !== undefined && !blocks) {
    return jsonError(400, 'BAD_REQUEST', 'Blocks must be a valid array.', { correlationId });
  }

  const audience = body.audience !== undefined ? sanitizeAudience(body.audience) : undefined;
  if (body.audience !== undefined && !audience) {
    return jsonError(400, 'BAD_REQUEST', 'Audience must be guest or owner.', { correlationId });
  }

  const actions = body.actions !== undefined ? sanitizeGuideActions(body.actions) : undefined;
  if (body.actions !== undefined && actions === null) {
    return jsonError(
      400,
      'BAD_REQUEST',
      'One or more quick actions is incomplete or invalid. Check button labels, topic links, and Alexa button numbers.',
      { correlationId }
    );
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await updateGuideTopic(db, topicId, {
    title,
    subtitle: body.subtitle !== undefined ? sanitizeRequiredText(body.subtitle, 160) : undefined,
    summary: body.summary !== undefined ? sanitizeRequiredText(body.summary, 240) : undefined,
    searchTerms: body.searchTerms !== undefined ? sanitizeStringArray(body.searchTerms) : undefined,
    applianceManualTerms:
      body.applianceManualTerms !== undefined ? sanitizeStringArray(body.applianceManualTerms) : undefined,
    blocks,
    actions,
    audience,
    updatedAt: new Date().toISOString()
  });

  if (!updated) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });

  return Response.json(toPublicGuideTopic(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} topicId
 * @param {string} correlationId
 */
async function publishTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await publishGuideTopic(db, topicId);
  if (!updated) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });

  return Response.json(toPublicGuideTopic(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function publishAll(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await publishAllGuideTopics(db);
  const draftCount = await countDraftGuideTopics(db);

  return Response.json({ ok: true, draftCount }, { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function patchSettings(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await updateGuideSettings(db, {
    homeSummaryTitle:
      body.homeSummaryTitle !== undefined ? sanitizeRequiredText(body.homeSummaryTitle, 120) : undefined,
    homeSummarySubtitle:
      body.homeSummarySubtitle !== undefined ? sanitizeRequiredText(body.homeSummarySubtitle, 160) : undefined,
    updatedAt: new Date().toISOString()
  });

  if (!updated) return jsonError(404, 'NOT_FOUND', 'Guide settings not found.', { correlationId });

  return Response.json(
    {
      homeSummaryTitle: updated.home_summary_title,
      homeSummarySubtitle: updated.home_summary_subtitle
    },
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function createTopic(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const id = sanitizeMediaId(String(body.id ?? ''));
  const categoryId = sanitizeMediaId(String(body.categoryId ?? ''));
  const title = sanitizeRequiredText(body.title, 120);
  const subtitle = sanitizeRequiredText(body.subtitle, 160);
  const summary = sanitizeRequiredText(body.summary, 240);
  const audience = sanitizeAudience(body.audience ?? 'guest');

  if (!id) return jsonError(400, 'BAD_REQUEST', 'Topic id is required (letters, numbers, hyphens).', { correlationId });
  if (!categoryId) return jsonError(400, 'BAD_REQUEST', 'Category id is required.', { correlationId });
  if (!title) return jsonError(400, 'BAD_REQUEST', 'Title is required.', { correlationId });
  if (!subtitle) return jsonError(400, 'BAD_REQUEST', 'Subtitle is required.', { correlationId });
  if (!summary) return jsonError(400, 'BAD_REQUEST', 'Summary is required.', { correlationId });
  if (!audience) return jsonError(400, 'BAD_REQUEST', 'Audience must be guest or owner.', { correlationId });

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const created = await createGuideTopic(db, {
    id,
    categoryId,
    title,
    subtitle,
    summary,
    audience,
    searchTerms: sanitizeStringArray(body.searchTerms ?? []),
    actions: sanitizeGuideActions(body.actions ?? []) ?? []
  });

  if (!created) return jsonError(404, 'NOT_FOUND', 'Category not found.', { correlationId });
  if (created.conflict) return jsonError(409, 'CONFLICT', 'A topic with that id already exists.', { correlationId });

  return Response.json(toPublicGuideTopic(created), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} topicId
 * @param {string} correlationId
 */
async function removeTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const removed = await deleteGuideTopic(db, topicId);
  if (!removed) return jsonError(404, 'NOT_FOUND', 'Topic not found.', { correlationId });

  return Response.json({ ok: true, id: topicId }, { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} categoryId
 * @param {string} correlationId
 */
async function reorderTopics(request, env, categoryId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  if (!Array.isArray(body.topicIds) || body.topicIds.length === 0) {
    return jsonError(400, 'BAD_REQUEST', 'Expected { topicIds: string[] }.', { correlationId });
  }

  const topicIds = body.topicIds.map((value) => sanitizeMediaId(String(value ?? ''))).filter(Boolean);
  if (topicIds.length !== body.topicIds.length) {
    return jsonError(400, 'BAD_REQUEST', 'Topic ids must use letters, numbers, and hyphens only.', { correlationId });
  }

  try {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    const result = await reorderGuideTopicsInCategory(db, categoryId, topicIds);
    if (!result) return jsonError(404, 'NOT_FOUND', 'Category not found.', { correlationId });
    if (result.invalid) {
      return jsonError(400, 'BAD_REQUEST', 'Topic order must include every topic in the category once.', {
        correlationId
      });
    }

    return Response.json({ ok: true }, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'guide_reorder_failed',
        categoryId,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    return jsonError(500, 'INTERNAL_ERROR', 'Could not reorder topics.', { correlationId });
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function listMedia(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const rows = await listGuideMedia(db);
  return Response.json(
    { media: rows.map((row) => toPublicGuideMedia(row)) },
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} mediaId
 * @param {string} correlationId
 */
async function removeMedia(request, env, mediaId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const existing = await getGuideMediaById(db, mediaId);
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Media not found.', { correlationId });
  if (!existing.object_key) {
    return jsonError(400, 'BAD_REQUEST', 'Bundled guide photos cannot be deleted here.', { correlationId });
  }

  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  await safeDeleteGuideMediaObject(bucket, String(existing.object_key));
  await deleteGuideMedia(db, mediaId);

  return Response.json({ ok: true, id: mediaId }, { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
async function uploadMedia(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const formData = await request.formData();
  const id = sanitizeMediaId(String(formData.get('id') ?? ''));
  const alt = sanitizeRequiredText(formData.get('alt'), 240);
  const fileField = formData.get('file');
  const fileCheck = validateGuideImageUpload(fileField instanceof File ? fileField : null);

  if (!id) return jsonError(400, 'BAD_REQUEST', 'Media id is required (letters, numbers, hyphens).', { correlationId });
  if (!alt) return jsonError(400, 'BAD_REQUEST', 'Alt text is required.', { correlationId });
  if (!fileCheck.ok) return jsonError(400, 'BAD_REQUEST', fileCheck.message, { correlationId });

  const file = fileCheck.file;
  const buffer = await file.arrayBuffer();
  const bufferCheck = validateGuideImageBuffer(buffer, file.type);
  if (!bufferCheck.ok) return jsonError(400, 'BAD_REQUEST', bufferCheck.message, { correlationId });

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  const objectKey = generateGuideMediaObjectKey();
  await putGuideMediaObject(bucket, objectKey, buffer, bufferCheck.mimeType);

  const existing = await getGuideMediaById(db, id);
  if (existing?.object_key) {
    await safeDeleteGuideMediaObject(bucket, String(existing.object_key));
  }
  if (existing) {
    await db
      .prepare(
        `UPDATE guide_media SET alt = ?, object_key = ?, source_file = NULL, original_filename = ?, mime_type = ?, file_size = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        alt,
        objectKey,
        sanitizeOriginalFilename(file.name),
        bufferCheck.mimeType,
        file.size,
        new Date().toISOString(),
        id
      )
      .run();
    const row = await getGuideMediaById(db, id);
    return Response.json(toPublicGuideMedia(row), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const created = await insertGuideMedia(db, {
    id,
    alt,
    objectKey,
    originalFilename: sanitizeOriginalFilename(file.name),
    mimeType: bufferCheck.mimeType,
    fileSize: file.size
  });

  return Response.json(toPublicGuideMedia(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} mediaId
 * @param {string} correlationId
 */
async function streamMediaFile(request, env, mediaId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);

  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const row = await getGuideMediaById(db, mediaId);
  if (!row || !row.object_key) {
    return jsonError(404, 'NOT_FOUND', 'Media not found.', { correlationId });
  }

  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  const object = await getGuideMediaObject(bucket, String(row.object_key));
  if (!object) return jsonError(404, 'NOT_FOUND', 'Media not found.', { correlationId });

  const headers = new Headers();
  headers.set('Content-Type', String(row.mime_type ?? object.httpMetadata?.contentType ?? 'image/jpeg'));
  headers.set('Cache-Control', 'private, max-age=3600');
  headers.set('Content-Disposition', 'inline');

  return new Response(object.body, { status: 200, headers });
}
