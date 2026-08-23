import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_BOARD_CONFIG } from "./board-url-state"
import {
  BOARD_INSTALLED_STORAGE_KEY,
  canUseInstalledBoardStorage,
  clearInstalledBoardConfig,
  installedBoardHashFromConfig,
  readInstalledBoardConfig,
  writeInstalledBoardConfig,
} from "./board-installed-storage"

const SAMPLE_KEY = "abcdef0123456789abcdef0123456789"

const memoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe("installedBoardHashFromConfig", () => {
  it("strips the key from the stored hash", () => {
    const hash = installedBoardHashFromConfig({
      ...DEFAULT_BOARD_CONFIG,
      stop: "940GZZLUOXC",
      key: SAMPLE_KEY,
    })
    assert.equal(hash.includes("key="), false)
    assert.equal(hash.includes("940GZZLUOXC"), true)
  })
})

describe("installed board storage", () => {
  it("round-trips a keyless layout and never writes the key", () => {
    const storage = memoryStorage()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    })

    const written = writeInstalledBoardConfig(
      {
        ...DEFAULT_BOARD_CONFIG,
        stop: "940GZZLUOXC",
        key: SAMPLE_KEY,
      },
      1_700_000_000_000
    )
    assert.ok(written)
    assert.equal(written?.hash.includes("key="), false)
    const raw = storage.getItem(BOARD_INSTALLED_STORAGE_KEY)
    assert.ok(raw)
    assert.equal(raw.includes(SAMPLE_KEY), false)

    const read = readInstalledBoardConfig()
    assert.equal(read?.stop, "940GZZLUOXC")
    assert.equal(read?.key, undefined)

    clearInstalledBoardConfig()
    assert.equal(readInstalledBoardConfig(), null)
    assert.equal(canUseInstalledBoardStorage(), true)

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
  })

  it("returns null when localStorage throws on write", () => {
    const storage: Storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
    }
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    })
    assert.equal(
      writeInstalledBoardConfig(
        { ...DEFAULT_BOARD_CONFIG, stop: "940GZZLUOXC" },
        1
      ),
      null
    )
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
  })

  it("returns null when localStorage is missing", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    })
    assert.equal(canUseInstalledBoardStorage(), false)
    assert.equal(
      writeInstalledBoardConfig(
        { ...DEFAULT_BOARD_CONFIG, stop: "940GZZLUOXC" },
        1
      ),
      null
    )
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
  })
})
