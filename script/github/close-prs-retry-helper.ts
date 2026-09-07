export function validRetry(status: number, retryMs: number, attempt: number): boolean {
    const isValidRetryStatus = (status === 403 || status === 429 || status >= 500)
    const canRetry = retryMs > 0 && attempt < 10
    return isValidRetryStatus && canRetry
  }