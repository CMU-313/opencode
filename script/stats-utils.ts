export function formatChange(change: number) {
    if (change > 0) {
      return ` (+${change.toLocaleString()})`
    }
  
    if (change < 0) {
      return ` (${change.toLocaleString()})`
    }
  
    return " (+0)"
  }