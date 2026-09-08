import { describe, expect, test } from "bun:test"
import {
  isImageAttachment,
  isMedia,
  isPdfAttachment,
  sniffAttachmentMime,
} from "../../src/util/media"

describe("util.media", () => {
  test("detects PNG from magic bytes", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("image/png")
  })

  test("detects JPEG from magic bytes", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("image/jpeg")
  })

  test("detects GIF from magic bytes", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x00, 0x00])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("image/gif")
  })

  test("detects BMP from magic bytes", () => {
    const bytes = new Uint8Array([0x42, 0x4d, 0x00, 0x00])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("image/bmp")
  })

  test("detects PDF from magic bytes", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("application/pdf")
  })

  test("detects WEBP from RIFF + WEBP markers", () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("image/webp")
  })

  test("does not detect WEBP from RIFF alone without WEBP marker", () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff])
    expect(sniffAttachmentMime(bytes, "application/octet-stream")).toBe("application/octet-stream")
  })

  test("returns fallback for unrecognized bytes", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    expect(sniffAttachmentMime(bytes, "text/plain")).toBe("text/plain")
  })

  test("isPdfAttachment matches only application/pdf", () => {
    expect(isPdfAttachment("application/pdf")).toBe(true)
    expect(isPdfAttachment("image/png")).toBe(false)
  })

  test("isMedia matches images and pdf", () => {
    expect(isMedia("image/png")).toBe(true)
    expect(isMedia("application/pdf")).toBe(true)
    expect(isMedia("text/plain")).toBe(false)
  })

  test("isImageAttachment excludes svg and fastbidsheet", () => {
    expect(isImageAttachment("image/png")).toBe(true)
    expect(isImageAttachment("image/svg+xml")).toBe(false)
    expect(isImageAttachment("image/vnd.fastbidsheet")).toBe(false)
  })
})