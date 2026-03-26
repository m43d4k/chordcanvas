import { describe, expect, it } from 'vitest'
import { toVersionedAssetUrl } from './versionedAsset'

describe('toVersionedAssetUrl', () => {
  it('appends the build id as a query parameter', () => {
    expect(toVersionedAssetUrl('/favicon.svg')).toBe(
      `/favicon.svg?v=${__APP_BUILD_ID__}`,
    )
  })

  it('preserves existing query parameters', () => {
    expect(toVersionedAssetUrl('/script.js?lang=ja')).toBe(
      `/script.js?lang=ja&v=${__APP_BUILD_ID__}`,
    )
  })
})
