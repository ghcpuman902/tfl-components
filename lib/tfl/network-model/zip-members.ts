import { createReadStream } from "node:fs"
import { open, stat } from "node:fs/promises"
import { createInflateRaw } from "node:zlib"
import type { Readable } from "node:stream"

const EOCD_SIG = Buffer.from([0x50, 0x4b, 0x05, 0x06])
const CD_SIG = Buffer.from([0x50, 0x4b, 0x01, 0x02])
const LOCAL_SIG = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const ZIP64_EXTRA = 0x0001

export type ZipMember = {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localOffset: number
}

const readExact = async (
  handle: Awaited<ReturnType<typeof open>>,
  position: number,
  length: number,
): Promise<Buffer> => {
  const buffer = Buffer.alloc(length)
  const { bytesRead } = await handle.read(buffer, 0, length, position)
  if (bytesRead !== length) {
    throw new Error(`Expected ${length} bytes at ${position}, read ${bytesRead}`)
  }
  return buffer
}

const readZip64Extra = (
  extra: Buffer,
  sizes: { uncompressed: number; compressed: number; localOffset: number },
): { uncompressed: number; compressed: number; localOffset: number } => {
  let offset = 0
  let { uncompressed, compressed, localOffset } = sizes
  while (offset + 4 <= extra.length) {
    const id = extra.readUInt16LE(offset)
    const length = extra.readUInt16LE(offset + 2)
    const payload = extra.subarray(offset + 4, offset + 4 + length)
    offset += 4 + length
    if (id !== ZIP64_EXTRA) continue
    let cursor = 0
    if (uncompressed === 0xffffffff) {
      uncompressed = Number(payload.readBigUInt64LE(cursor))
      cursor += 8
    }
    if (compressed === 0xffffffff) {
      compressed = Number(payload.readBigUInt64LE(cursor))
      cursor += 8
    }
    if (localOffset === 0xffffffff) {
      localOffset = Number(payload.readBigUInt64LE(cursor))
    }
  }
  return { uncompressed, compressed, localOffset }
}

export const listZipMembers = async (zipPath: string): Promise<ZipMember[]> => {
  const file = await open(zipPath, "r")
  try {
    const size = (await file.stat()).size
    const tailSize = Math.min(size, 256 * 1024)
    const tail = await readExact(file, size - tailSize, tailSize)
    const eocdAt = tail.lastIndexOf(EOCD_SIG)
    if (eocdAt < 0) throw new Error(`No zip end-of-central-directory in ${zipPath}`)
    const eocd = tail.subarray(eocdAt)
    const cdSize = eocd.readUInt32LE(12)
    const cdOffset = eocd.readUInt32LE(16)
    const cd =
      cdOffset >= size - tailSize
        ? tail.subarray(cdOffset - (size - tailSize), cdOffset - (size - tailSize) + cdSize)
        : await readExact(file, cdOffset, cdSize)

    const members: ZipMember[] = []
    let cursor = 0
    while (cursor < cd.length) {
      if (!cd.subarray(cursor, cursor + 4).equals(CD_SIG)) {
        throw new Error(`Bad central-directory signature at ${cursor}`)
      }
      const method = cd.readUInt16LE(cursor + 10)
      let compressed = cd.readUInt32LE(cursor + 20)
      let uncompressed = cd.readUInt32LE(cursor + 24)
      const nameLength = cd.readUInt16LE(cursor + 28)
      const extraLength = cd.readUInt16LE(cursor + 30)
      const commentLength = cd.readUInt16LE(cursor + 32)
      let localOffset = cd.readUInt32LE(cursor + 42)
      const name = cd.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8")
      const extra = cd.subarray(
        cursor + 46 + nameLength,
        cursor + 46 + nameLength + extraLength,
      )
      const zip64 = readZip64Extra(extra, {
        uncompressed,
        compressed,
        localOffset,
      })
      compressed = zip64.compressed
      uncompressed = zip64.uncompressed
      localOffset = zip64.localOffset
      members.push({
        name,
        method,
        compressedSize: compressed,
        uncompressedSize: uncompressed,
        localOffset,
      })
      cursor += 46 + nameLength + extraLength + commentLength
    }
    return members
  } finally {
    await file.close()
  }
}

export const openZipMember = async (
  zipPath: string,
  member: ZipMember,
): Promise<Readable> => {
  const file = await open(zipPath, "r")
  try {
    const header = await readExact(file, member.localOffset, 30)
    if (!header.subarray(0, 4).equals(LOCAL_SIG)) {
      throw new Error(`Bad local header for ${member.name}`)
    }
    const nameLength = header.readUInt16LE(26)
    const extraLength = header.readUInt16LE(28)
    const dataStart = member.localOffset + 30 + nameLength + extraLength
    const dataEnd = dataStart + member.compressedSize
    const compressed = createReadStream(zipPath, {
      start: dataStart,
      end: dataEnd - 1,
    })
    if (member.method === 0) return compressed
    if (member.method !== 8) {
      compressed.destroy()
      throw new Error(`Unsupported zip method ${member.method} for ${member.name}`)
    }
    const inflate = createInflateRaw()
    compressed.on("error", (error) => inflate.destroy(error))
    return compressed.pipe(inflate)
  } finally {
    await file.close()
  }
}

export const requireZipMember = (
  members: readonly ZipMember[],
  name: string,
): ZipMember => {
  const member = members.find((entry) => entry.name === name)
  if (!member) throw new Error(`Zip has no ${name}`)
  return member
}

export const zipLooksComplete = async (
  zipPath: string,
  expectedBytes?: number,
): Promise<boolean> => {
  try {
    const size = (await stat(zipPath)).size
    if (expectedBytes && size !== expectedBytes) return false
    const members = await listZipMembers(zipPath)
    return members.length > 0
  } catch {
    return false
  }
}
