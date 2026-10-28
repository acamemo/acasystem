/**
 * The file of a `file` field of a flow (`POST /api/dispositivi/flussi/:flowId/file`): the bytes
 * go as the raw body, the field and the file name in the query. The server sends the file to
 * Home Assistant and answers with the id to put in the answer of the step.
 */
import { backendRequest } from '@/api/backendClient';
import { isObject } from '@/validators/guards';

/** Same limit as the server; a larger file is refused here without being sent. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function uploadFlowFile(
  flowId: string,
  field: string,
  file: File
): Promise<{ fileId: string; fileName: string }> {
  const query = `campo=${encodeURIComponent(field)}&nome=${encodeURIComponent(file.name)}`;
  const body = await backendRequest(
    `/dispositivi/flussi/${encodeURIComponent(flowId)}/file?${query}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file }
  );
  if (!isObject(body) || typeof body.fileId !== 'string') throw new Error('Unexpected answer');
  return { fileId: body.fileId, fileName: typeof body.fileName === 'string' ? body.fileName : file.name };
}
