export function getChannelFromUrl(): string | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (!path) return null
  const [channel] = path.split('/')
  return channel || null
}
