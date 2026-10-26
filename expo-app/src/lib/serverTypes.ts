export type ApiDocument = {
  $id: string
  $createdAt: string
  $updatedAt: string
  [key: string]: unknown
}

export type ApiDocumentList<T extends ApiDocument = ApiDocument> = {
  documents: T[]
  total: number
}

export type ApiFile = ApiDocument & {
  name?: string
  mimeType?: string
  sizeOriginal?: number
}

export type ApiPreferences = Record<string, unknown>

export namespace Models {
  export type Document = ApiDocument
  export type DocumentList<T extends Document = Document> = ApiDocumentList<T>
  export type File = ApiFile
  export type Preferences = ApiPreferences
}

export class PersistenceError extends Error {
  readonly code: number
  readonly type: string

  constructor(message: string, code: number, type = 'api_error') {
    super(message)
    this.name = 'PersistenceError'
    this.code = code
    this.type = type
  }
}

type QueryValue = string | number | boolean

function query(method: string, attribute?: string, values: QueryValue[] = []): string {
  return JSON.stringify({ method, ...(attribute ? { attribute } : {}), values })
}

export const Query = {
  equal: (field: string, value: QueryValue | QueryValue[]) =>
    query('equal', field, Array.isArray(value) ? value : [value]),
  greaterThanEqual: (field: string, value: string | number) => query('greaterThanEqual', field, [value]),
  lessThan: (field: string, value: string | number) => query('lessThan', field, [value]),
  lessThanEqual: (field: string, value: string | number) => query('lessThanEqual', field, [value]),
  orderAsc: (field: string) => query('orderAsc', field),
  orderDesc: (field: string) => query('orderDesc', field),
  limit: (value: number) => query('limit', undefined, [value]),
  offset: (value: number) => query('offset', undefined, [value]),
  cursorAfter: (id: string) => query('cursorAfter', undefined, [id]),
  select: (fields: string[]) => query('select', undefined, fields),
}

export const ID = {
  unique: (): string => {
    const cryptoObject = globalThis.crypto
    if (cryptoObject?.randomUUID) return cryptoObject.randomUUID()
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  },
}

// Kept as harmless no-ops while the feature modules shed database-specific
// permission arguments. Authorization is enforced by the server bearer token.
export const Permission = {
  read: (role: string) => role,
  update: (role: string) => role,
  delete: (role: string) => role,
}

export const Role = {
  user: (id: string) => id,
}

export type DocumentArgs = {
  databaseId?: string
  collectionId: string
  documentId?: string
  data?: Record<string, unknown>
  queries?: string[]
  permissions?: string[]
}

export type ServerDatabase = {
  listDocuments<T extends ApiDocument = ApiDocument>(args: DocumentArgs): Promise<ApiDocumentList<T>>
  getDocument<T extends ApiDocument = ApiDocument>(args: DocumentArgs): Promise<T>
  createDocument<T extends ApiDocument = ApiDocument>(args: DocumentArgs): Promise<T>
  updateDocument<T extends ApiDocument = ApiDocument>(args: DocumentArgs): Promise<T>
  deleteDocument(args: DocumentArgs): Promise<void>
}

export type ServerAccount = {
  get<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T>
  getPrefs<T extends ApiPreferences = ApiPreferences>(): Promise<T>
  updatePrefs<T extends ApiPreferences = ApiPreferences>(args: { prefs: T }): Promise<T>
  createJWT(): Promise<{ jwt: string | null }>
}

export type ServerStorage = {
  deleteFile(args: { bucketId?: string; fileId: string }): Promise<void>
}
