@ui
Feature: Cart
  Products picked from the catalog land in the cart with their price and quantity;
  a logged in user orders them

  Background:
    Given user opens the products page

  @all-devices
  Scenario Outline: Add "<product>" to cart
    When user adds "<product>" to cart
    And user opens the cart
    Then cart has:
      | name      | price   | quantity | total   |
      | <product> | <price> |        1 | <price> |

    @smoke
    Examples: Women
      | product  | price   |
      | Blue Top | Rs. 500 |

    Examples: Men
      | product    | price   |
      | Men Tshirt | Rs. 400 |

  Scenario: Add several pieces from product page
    When user adds 3 of "Blue Top" from its product page
    And user opens the cart
    Then cart total for "Blue Top" is Rs. 1500

  @fail
  Scenario Outline: Quantity <quantity> is not added to cart
    Known bug (seen live 2026-10-25): the shop adds any quantity, 0 and negative included.
    The fail tag runs the test and expects it to fail - once the bug is fixed, the tag goes.

    When user adds <quantity> of "Men Tshirt" from its product page
    Then cart is empty

    Examples:
      | quantity |
      |        0 |
      |       -2 |

  Rule: Removing products

    Background:
      Given cart has "Blue Top"

    Scenario: Remove last product
      When user removes "Blue Top" from cart
      Then cart is empty

  @e2e @timeout:90000 @logged-in
  Rule: Checkout
    The user is registered through the API and logs in before the scenario

    Background:
      Given cart has "Blue Top"

    @all-devices @retries:1 @fail:tablet
    Scenario: Place order with delivery comment
      Known bug (seen live 2026-10-25): on a 1024px wide tablet a page container covers
      "Proceed To Checkout", so the order cannot be placed. Other devices run the test as usual.

      When user places the order with comment:
        """
        Leave at the door.
        Call before delivery.
        """
      And user pays by card
      Then order is confirmed
      And cart is empty

    Scenario: Check invoice of placed order
      When user places the order with comment:
        """
        Invoice check
        """
      And user pays by card
      And user downloads the invoice
      Then invoice shows total amount Rs. 500
