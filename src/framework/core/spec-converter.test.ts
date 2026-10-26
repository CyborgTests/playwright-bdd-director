import { describe, expect, it } from 'vitest'

import { featureSpecToMarkdown, markdownSpecToFeature } from '@/framework/core/spec-converter'

const MARKDOWN = `@ui @shop
## [TS01] Shop
- Products land in the cart

---

### Background
#### Open Home Page

---

@smoke
### [TC01] Add "<product>" to cart
- Price comes from the catalog
| product | price   |
| ------- | ------- |
| Top     | Rs. 500 |
| A \\| B  | Rs. 1   |
#### Add "<product>" to cart
- Click "Add to cart"
- Wait for the modal
#### Verify cart has "<product>"

---

### [] Empty cart
#### Open cart
#### Verify cart is empty
`

describe('markdownSpecToFeature', () => {
  it('should move tags, IDs, notes, Background and examples to Gherkin with "*" steps', () => {
    expect(markdownSpecToFeature(MARKDOWN)).toBe(`@ui @shop
Feature: [TS01] Shop
  - Products land in the cart

  Background:
    * Open Home Page

  @smoke
  Scenario Outline: [TC01] Add "<product>" to cart
    - Price comes from the catalog
    * Add "<product>" to cart
    # Click "Add to cart"
    # Wait for the modal
    * Verify cart has "<product>"

    Examples:
      | product | price   |
      | Top     | Rs. 500 |
      | A \\| B  | Rs. 1   |

  Scenario: [] Empty cart
    * Open cart
    * Verify cart is empty
`)
  })

  it('should put Background first', () => {
    const feature = markdownSpecToFeature(`## Shop
### Open cart
#### Open cart
### Background: Login
#### Log in
`)
    expect(feature.indexOf('Background: Login')).toBeLessThan(feature.indexOf('Scenario:'))
  })
})

describe('featureSpecToMarkdown', () => {
  it('should give back the Markdown spec it was converted from', () => {
    expect(featureSpecToMarkdown(markdownSpecToFeature(MARKDOWN), 'shop.feature')).toBe(MARKDOWN)
  })

  it('should drop step keywords, join Examples blocks and turn descriptions and comments into notes', () => {
    const feature = `@ui
Feature: Shop
  Products picked from the catalog
  land in the cart

  - Prices in rupees

  Scenario Outline: Add <product>
    Given user opens catalog
    # Catalog of all categories
    When user adds <product>
    Then cart has <product>

    Examples:
      | product |
      | Top     |

    Examples:
      | product |
      | Dress   |
`
    expect(featureSpecToMarkdown(feature, 'shop.feature')).toBe(`@ui
## Shop
- Products picked from the catalog land in the cart
- Prices in rupees

---

### Add <product>
| product |
| ------- |
| Top     |
| Dress   |
#### user opens catalog
- Catalog of all categories
#### user adds <product>
#### cart has <product>
`)
  })

  it('should list everything Markdown cannot hold', () => {
    const feature = `Feature: Shop
  Scenario Outline: Pay
    Given cart has:
      | product |
      | Top     |
    When user pays with
      """
      card
      """

    @smoke
    Examples: Cards
      | card |
      | visa |

  Rule: Checkout
    Scenario: Order
      Given user orders
`
    expect(() => featureSpecToMarkdown(feature, 'shop.feature')).toThrow(
      `Markdown cannot hold shop.feature:
  - DataTable of step "cart has:" (line 3)
  - DocString of step "user pays with" (line 6)
  - tags of Examples of "Pay" (line 12)
  - name or description of Examples of "Pay" (line 12)
  - Rule "Checkout" (line 16)
  Fix: Keep the suite in Gherkin, or remove these from it first`
    )
  })
})
