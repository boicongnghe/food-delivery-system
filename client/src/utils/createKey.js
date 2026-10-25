let counter = 0

// Stable client-only key for items in editable lists (React `key`), never sent to the server
export function createKey() {
  counter += 1
  return `k${counter}`
}
