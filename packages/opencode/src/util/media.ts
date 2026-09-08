const startsWith = (bytes: Uint8Array, prefix: number[]) => prefix.every((value, index) => bytes[index] === value)

export function isPdfAttachment(mime: string) {
  return mime === "application/pdf"
}

export function isMedia(mime: string) {
  return mime.startsWith("image/") || isPdfAttachment(mime)
}

export function isImageAttachment(mime: string) {
  return mime.startsWith("image/") && mime !== "image/svg+xml" && mime !== "image/vnd.fastbidsheet"
}

interface MimeSignature {
  mime: string
  matches: (bytes: Uint8Array) => boolean
}

const MIME_SIGNATURES: MimeSignature[] = [
  { mime: "image/png", matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: "image/jpeg", matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  { mime: "image/gif", matches: (bytes) => startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) },
  { mime: "image/bmp", matches: (bytes) => startsWith(bytes, [0x42, 0x4d]) },
  { mime: "application/pdf", matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  {
    mime: "image/webp",
    matches: (bytes) =>
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]),
  },
]

export function sniffAttachmentMime(bytes: Uint8Array, fallback: string) {
  const signature = MIME_SIGNATURES.find((candidate) => candidate.matches(bytes))
  return signature?.mime ?? fallback
}
