import { inflateRawSync } from 'zlib'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Magic constants ──────────────────────────────────────────────────────────
const EGG_MAGIC            = 0x41474745
const FILE_MAGIC           = 0x0A8590E3
const BLOCK_MAGIC          = 0x02B50C13
const ENCRYPT_MAGIC        = 0x08D1470F
const FILENAME_MAGIC       = 0x0A8591AC
const WINDOWS_INFO_MAGIC   = 0x2C86950B
const POSIX_INFO_MAGIC     = 0x1EE922E5
const COMMENT_MAGIC        = 0x04C63672
const SPLIT_MAGIC          = 0x24F5A262
const SOLID_MAGIC          = 0x24E5A060
const DUMMY_MAGIC          = 0x07463307
const GLOBAL_ENCRYPT_MAGIC = 0x08D144A8
const SKIP_MAGIC           = 0xFFFF0000
const END_MAGIC            = 0x08E28222

const DIRECTORY_ATTRIBUTE  = 0x80
const POSIX_DIRECTORY_MODE = 0o040000

const METHOD_NAMES: Record<number, string> = {
  0: 'store',
  1: 'deflate',
  2: 'bzip2',
  3: 'azo',
  4: 'lzma',
}

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ CRC32_TABLE[(c ^ data[i]) & 0xFF]
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── ByteReader ───────────────────────────────────────────────────────────────
class ByteReader {
  private view: DataView
  offset = 0

  constructor(buf: ArrayBuffer) { this.view = new DataView(buf) }

  remaining() { return this.view.byteLength - this.offset }

  peek32(): number | null {
    if (this.remaining() < 4) return null
    return this.view.getUint32(this.offset, true)
  }

  read(n: number): Uint8Array {
    if (this.offset + n > this.view.byteLength) throw new Error('Unexpected end of archive')
    const chunk = new Uint8Array(this.view.buffer, this.offset, n)
    this.offset += n
    return chunk
  }

  u8()  { const v = this.view.getUint8(this.offset);               this.offset += 1; return v }
  u16() { const v = this.view.getUint16(this.offset, true);        this.offset += 2; return v }
  u32() { const v = this.view.getUint32(this.offset, true);        this.offset += 4; return v }
  u64() { const v = this.view.getBigUint64(this.offset, true);     this.offset += 8; return v }
}

// ── Field ────────────────────────────────────────────────────────────────────
interface Field {
  magic: number
  bitflag: number
  payload: Uint8Array
  rawSize: number
}

function readField(r: ByteReader): Field {
  const magic = r.u32()
  if (magic === END_MAGIC) throw new Error('END magic is not a field')
  if (magic === SKIP_MAGIC) return { magic, bitflag: 0, payload: new Uint8Array(0), rawSize: 0 }
  const bitflag = r.u8()
  const rawSize = (bitflag & 0x01) ? r.u32() : r.u16()
  const payload = r.read(rawSize)
  return { magic, bitflag, payload, rawSize }
}

// ── Name decoding ────────────────────────────────────────────────────────────
function decodeName(payload: Uint8Array, bitflag: number): string {
  if (bitflag & 0x04) throw new Error('Encrypted filenames are not supported')

  if (!(bitflag & 0x08)) return new TextDecoder('utf-8').decode(payload)

  let locale = 0
  let nameBytes = payload
  if (payload.length >= 2) {
    locale = new DataView(payload.buffer, payload.byteOffset, 2).getUint16(0, true)
    nameBytes = payload.slice(2)
  }

  const encodingMap: Record<number, string> = { 0: 'utf-8', 932: 'shift-jis', 949: 'euc-kr' }
  const encoding = encodingMap[locale] ?? 'utf-8'
  return new TextDecoder(encoding, { fatal: false }).decode(nameBytes)
}

// ── Path sanitization ────────────────────────────────────────────────────────
function sanitizePath(raw: string): string {
  const parts = raw.replace(/\\/g, '/').split('/').filter(p => p !== '' && p !== '.' && p !== '..')
  return parts.join('/')
}

// ── Decompression ────────────────────────────────────────────────────────────
function decompressBlock(method: number, data: Uint8Array): Uint8Array {
  if (method === 0) return data
  if (method === 1) return new Uint8Array(inflateRawSync(Buffer.from(data)))
  if (method === 3) throw new Error('AZO compression is not supported')
  if (method === 2) throw new Error('bzip2 compression is not supported in this demo')
  if (method === 4) throw new Error('LZMA compression is not supported in this demo')
  throw new Error(`Unknown compression method ${method}`)
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface ExtractedFile {
  path: string
  size: number
  isDirectory: boolean
  method: string
  data?: string   // base64, only for files <= 512 KB
}

interface FileEntry {
  fileId: number
  path: string
  expectedSize: number
  isDirectory: boolean
  posixMode: number | null
  windowsAttribute: number | null
  buffer: number[]
  method: string
}

// ── Main extractor ───────────────────────────────────────────────────────────
function extractEgg(buf: ArrayBuffer): { files: ExtractedFile[]; isSplit: boolean; isSolid: boolean } {
  const r = new ByteReader(buf)

  // EGG header
  if (r.u32() !== EGG_MAGIC) throw new Error('Not an EGG archive (invalid magic)')
  const version = r.u16()
  if (version !== 0x0100) throw new Error(`Unsupported EGG version: ${version.toString(16)}`)
  r.u32() // header_id
  r.u32() // reserved

  let isSplit = false
  let isSolid = false

  while (true) {
    const magic = r.peek32()
    if (magic === END_MAGIC) { r.u32(); break }
    const field = readField(r)
    if (field.magic === SPLIT_MAGIC) isSplit = true
    else if (field.magic === SOLID_MAGIC) isSolid = true
    else if (field.magic === GLOBAL_ENCRYPT_MAGIC) throw new Error('Encrypted EGG archives are not supported')
  }

  if (isSplit) throw new Error('Split EGG archives (.vol1.egg, .vol2.egg…) are not supported in this demo — upload only the first volume')

  const idToPath: Map<number, string> = new Map()
  const pending: FileEntry[] = []
  const results: ExtractedFile[] = []
  let current: FileEntry | null = null

  while (r.remaining() > 0) {
    const magic = r.peek32()
    if (magic === null) break
    if (magic === END_MAGIC) { r.u32(); continue }

    if (magic === FILE_MAGIC) {
      r.u32() // consume FILE_MAGIC
      const fileId = r.u32()
      const fileLengthBig = r.u64()
      const fileLength = Number(fileLengthBig)

      let filePath: string | null = null
      let windowsAttribute: number | null = null
      let posixMode: number | null = null

      while (true) {
        const fm = r.peek32()
        if (fm === END_MAGIC) { r.u32(); break }
        const field = readField(r)

        if (field.magic === FILENAME_MAGIC) {
          if (field.bitflag & 0x10) {
            if (field.payload.length < 4) throw new Error('Relative filename field is truncated')
            const parentId = new DataView(field.payload.buffer, field.payload.byteOffset, 4).getUint32(0, true)
            const name = decodeName(field.payload.slice(4), field.bitflag)
            const parentPath = idToPath.get(parentId)
            if (parentPath === undefined) throw new Error(`Missing parent id ${parentId}`)
            filePath = parentPath + '/' + sanitizePath(name)
          } else {
            filePath = sanitizePath(decodeName(field.payload, field.bitflag))
          }
        } else if (field.magic === WINDOWS_INFO_MAGIC) {
          if (field.rawSize >= 9) windowsAttribute = field.payload[8]
        } else if (field.magic === POSIX_INFO_MAGIC) {
          if (field.rawSize >= 4) posixMode = new DataView(field.payload.buffer, field.payload.byteOffset, 4).getUint32(0, true)
        } else if (field.magic === ENCRYPT_MAGIC) {
          throw new Error('Encrypted file entries are not supported')
        }
      }

      if (filePath === null) throw new Error(`File entry ${fileId} has no filename`)

      let isDirectory = false
      if (windowsAttribute !== null) isDirectory = Boolean(windowsAttribute & DIRECTORY_ATTRIBUTE)
      if (posixMode !== null) isDirectory = isDirectory || (posixMode & POSIX_DIRECTORY_MODE) === POSIX_DIRECTORY_MODE

      idToPath.set(fileId, filePath)

      const entry: FileEntry = { fileId, path: filePath, expectedSize: fileLength, isDirectory, posixMode, windowsAttribute, buffer: [], method: 'store' }
      pending.push(entry)

      if (fileLength === 0 || isDirectory) {
        results.push({ path: filePath, size: fileLength, isDirectory, method: 'store' })
      } else if (!isSolid) {
        current = entry
      }
      continue
    }

    if (magic === BLOCK_MAGIC) {
      r.u32() // consume BLOCK_MAGIC
      const method = r.u8()
      r.u8() // hint
      const uncompressedSize = r.u32()
      const compressedSize = r.u32()
      const expectedCrc = r.u32()

      while (true) {
        const bm = r.peek32()
        if (bm === END_MAGIC) { r.u32(); break }
        const field = readField(r)
        if (field.magic === ENCRYPT_MAGIC) throw new Error('Encrypted block entries are not supported')
      }

      const compressed = r.read(compressedSize)
      const block = decompressBlock(method, compressed)
      const methodName = METHOD_NAMES[method] ?? `method_${method}`

      if (block.length !== uncompressedSize) throw new Error(`Block size mismatch: expected ${uncompressedSize}, got ${block.length}`)

      const actualCrc = crc32(block)
      if (actualCrc !== expectedCrc) throw new Error(`CRC32 mismatch: expected ${expectedCrc.toString(16)}, got ${actualCrc.toString(16)}`)

      if (isSolid) {
        let consumed = 0
        while (consumed < block.length) {
          const target = pending.find(e => !e.isDirectory && e.buffer.length < e.expectedSize)
          if (!target) throw new Error('Solid block has data for unknown entry')
          const need = target.expectedSize - target.buffer.length
          const chunk = block.subarray(consumed, consumed + need)
          target.buffer.push(...chunk)
          target.method = methodName
          consumed += chunk.length
          if (target.buffer.length === target.expectedSize) {
            const data = target.expectedSize <= 512 * 1024
              ? Buffer.from(target.buffer).toString('base64')
              : undefined
            results.push({ path: target.path, size: target.expectedSize, isDirectory: false, method: methodName, data })
          }
        }
        continue
      }

      if (!current) {
        current = pending.find(e => !e.isDirectory && e.buffer.length < e.expectedSize) ?? null
      }
      if (!current) throw new Error('Block without a file entry')

      current.method = methodName
      for (let i = 0; i < block.length; i++) current.buffer.push(block[i])

      if (current.buffer.length > current.expectedSize) throw new Error(`${current.path} exceeded declared size`)

      if (current.buffer.length === current.expectedSize) {
        const data = current.expectedSize <= 512 * 1024
          ? Buffer.from(current.buffer).toString('base64')
          : undefined
        results.push({ path: current.path, size: current.expectedSize, isDirectory: false, method: methodName, data })
        current = null
      }
      continue
    }

    if (magic === COMMENT_MAGIC || magic === DUMMY_MAGIC || magic === SKIP_MAGIC) {
      readField(r)
      continue
    }

    throw new Error(`Unknown record magic ${magic?.toString(16)} at offset ${r.offset}`)
  }

  const unfinished = pending.filter(e => !e.isDirectory && e.buffer.length < e.expectedSize && e.expectedSize > 0)
  if (unfinished.length > 0) {
    throw new Error(`Archive ended before completing: ${unfinished.map(e => e.path).join(', ')}`)
  }

  return { files: results, isSplit, isSolid }
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ success: false, error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) {
      return Response.json({ success: false, error: `File too large (max 20 MB, got ${(file.size / 1024 / 1024).toFixed(1)} MB)` }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const { files, isSplit, isSolid } = extractEgg(arrayBuffer)

    const totalSize = files.reduce((s, f) => s + f.size, 0)

    return Response.json({
      success: true,
      files,
      archiveSize: file.size,
      isSplit,
      isSolid,
      totalFiles: files.filter(f => !f.isDirectory).length,
      totalDirs: files.filter(f => f.isDirectory).length,
      totalSize,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ success: false, error: message }, { status: 400 })
  }
}
