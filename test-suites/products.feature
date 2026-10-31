@ui
Feature: Product Catalog
  The catalog page: search by part of a name, prices matching the API

  Background:
    Given user opens the products page

  Scenario Outline: Find "<product>" by "<query>"
    When user searches for "<query>"
    Then search results include "<product>"

    Examples:
      | query | product       |
      | Top   | Blue Top      |
      | Dress | Stylish Dress |

  @e2e
  Scenario: Catalog price of "Blue Top" matches the API
    Given catalog API lists "Blue Top" for Rs. 500
    Then products page shows "Blue Top" for Rs. 500
