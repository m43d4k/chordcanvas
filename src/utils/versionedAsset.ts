export function toVersionedAssetUrl(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}v=${__APP_BUILD_ID__}`
}
