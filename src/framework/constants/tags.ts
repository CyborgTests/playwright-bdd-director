/**
 * Kind of a generated test, set by the Director: every step has a step definition (auto) or at
 * least one step is walked by a person (cyborg). Specs never write these tags.
 */
export const KIND_TAGS = { auto: '@auto', cyborg: '@cyborg' } as const

/** Layer of a test case - exactly one, from spec tags: a case tag overrides the suite tag */
export const LAYER_TAGS = ['@api', '@ui', '@e2e'] as const

/** Layers a person can walk: an API case with a manual step stays fixme instead */
export const CYBORG_LAYERS: readonly string[] = ['@ui', '@e2e']

/**
 * UI and E2E tests run on desktop browsers; this spec tag (any level) adds tablets and mobiles.
 * Which browsers and devices that means is the Playwright projects' business (src/config).
 */
export const ALL_DEVICES_TAG = '@all-devices'

/** Where a test runs: no browser (API), desktop browsers, or desktops plus tablets and mobiles */
export type Devices = 'none' | 'desktop' | 'all'

export type KindTag = (typeof KIND_TAGS)[keyof typeof KIND_TAGS]
export type LayerTag = (typeof LAYER_TAGS)[number]

export function isLayerTag(tag: string): tag is LayerTag {
  return (LAYER_TAGS as readonly string[]).includes(tag)
}

export function isKindTag(tag: string): boolean {
  return Object.values<string>(KIND_TAGS).includes(tag)
}
