const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let crc = i
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const writeU16 = (target: Uint8Array, offset: number, value: number) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

const writeU32 = (target: Uint8Array, offset: number, value: number) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

export type ZipFile = {
  name: string
  data: Uint8Array
}

/** Uncompressed ZIP (STORE). Inspectable; not minified. */
export const buildZipArchive = (files: readonly ZipFile[]): Uint8Array => {
  const encoder = new TextEncoder()
  const entries = files.map((file) => {
    const nameBytes = encoder.encode(file.name)
    const checksum = crc32(file.data)
    return { ...file, nameBytes, checksum }
  })

  const localSize = entries.reduce(
    (sum, entry) => sum + 30 + entry.nameBytes.length + entry.data.length,
    0
  )
  const centralSize = entries.reduce(
    (sum, entry) => sum + 46 + entry.nameBytes.length,
    0
  )
  const out = new Uint8Array(localSize + centralSize + 22)

  let localOffset = 0
  const localOffsets: number[] = []
  for (const entry of entries) {
    localOffsets.push(localOffset)
    writeU32(out, localOffset, 0x04034b50)
    writeU16(out, localOffset + 4, 20)
    writeU16(out, localOffset + 8, 0)
    writeU16(out, localOffset + 10, 0)
    writeU16(out, localOffset + 12, 0)
    writeU32(out, localOffset + 14, entry.checksum)
    writeU32(out, localOffset + 18, entry.data.length)
    writeU32(out, localOffset + 22, entry.data.length)
    writeU16(out, localOffset + 26, entry.nameBytes.length)
    writeU16(out, localOffset + 28, 0)
    out.set(entry.nameBytes, localOffset + 30)
    out.set(entry.data, localOffset + 30 + entry.nameBytes.length)
    localOffset += 30 + entry.nameBytes.length + entry.data.length
  }

  let centralOffset = localOffset
  for (const [index, entry] of entries.entries()) {
    writeU32(out, centralOffset, 0x02014b50)
    writeU16(out, centralOffset + 4, 20)
    writeU16(out, centralOffset + 6, 20)
    writeU16(out, centralOffset + 10, 0)
    writeU16(out, centralOffset + 12, 0)
    writeU16(out, centralOffset + 14, 0)
    writeU32(out, centralOffset + 16, entry.checksum)
    writeU32(out, centralOffset + 20, entry.data.length)
    writeU32(out, centralOffset + 24, entry.data.length)
    writeU16(out, centralOffset + 28, entry.nameBytes.length)
    writeU16(out, centralOffset + 30, 0)
    writeU16(out, centralOffset + 32, 0)
    writeU16(out, centralOffset + 34, 0)
    writeU16(out, centralOffset + 36, 0)
    writeU32(out, centralOffset + 38, 0)
    writeU32(out, centralOffset + 42, localOffsets[index]!)
    out.set(entry.nameBytes, centralOffset + 46)
    centralOffset += 46 + entry.nameBytes.length
  }

  writeU32(out, centralOffset, 0x06054b50)
  writeU16(out, centralOffset + 4, 0)
  writeU16(out, centralOffset + 6, 0)
  writeU16(out, centralOffset + 8, entries.length)
  writeU16(out, centralOffset + 10, entries.length)
  writeU32(out, centralOffset + 12, centralSize)
  writeU32(out, centralOffset + 16, localSize)
  writeU16(out, centralOffset + 20, 0)
  return out
}

export const encodeUtf8 = (value: string): Uint8Array =>
  new TextEncoder().encode(value)
