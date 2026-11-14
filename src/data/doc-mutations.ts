/**
 * What a landlord can do with a document: add one, put a file behind a row,
 * take the file off again, say what it is, and remove one they added.
 *
 * The file's bytes are kept by `./files`; these change the record that points
 * at them. In production each becomes a server action and the file an upload
 * to private storage, behind the same names.
 */
import type { Doc, ID } from '@/domain/types'
import { deleteFile, type SavedFile } from './files'
import { db, newId, nowIso } from './store'

/** Files a new document for a home. It is listed as "Other" until the person says what it is. */
export function addDocument(home: { id: ID; orgId: ID }, file: SavedFile, name: string, tenancyId?: ID): ID {
  const id = newId('doc')
  db.insert('docs', { id, orgId: home.orgId, propertyId: home.id, tenancyId, name, kind: 'other', addedAt: nowIso(), sizeKb: file.sizeKb, source: 'uploaded', fileId: file.id, mime: file.mime, addedHere: true })
  return id
}

/** Puts a file behind a row, replacing any file that was there. */
export function attachFile(docId: ID, file: SavedFile): void {
  const doc = db.get().docs.find((d) => d.id === docId)
  if (!doc) return
  if (doc.fileId) void deleteFile(doc.fileId)
  db.update('docs', docId, { fileId: file.id, mime: file.mime, sizeKb: file.sizeKb })
}

/** Takes the file off a row and deletes it from this device. The row stays. */
export function detachFile(docId: ID): void {
  const doc = db.get().docs.find((d) => d.id === docId)
  if (!doc?.fileId) return
  void deleteFile(doc.fileId)
  db.update('docs', docId, { fileId: undefined, mime: undefined })
}

export function setDocumentKind(docId: ID, kind: Doc['kind']): void {
  db.update('docs', docId, { kind })
}

/** Removes a document the person added themselves, with its file. Rows Loop filed are part of the record and stay. */
export function removeDocument(docId: ID): boolean {
  const doc = db.get().docs.find((d) => d.id === docId)
  if (!doc?.addedHere) return false
  if (doc.fileId) void deleteFile(doc.fileId)
  db.remove('docs', docId)
  return true
}
