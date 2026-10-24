Feature: Header Navigation With Step Definitions
  The same header flows as navigation.md, automated by shared step definitions

  Background:
    Given user opens the home page

  Scenario Outline: See "<form>" form on "Signup / Login" page
    When user clicks "Signup / Login" button in header
    Then "<form>" form is visible

    Examples:
      | form                  |
      | Login to your account |
      | New User Signup!      |

  Scenario: Go back home from "Signup / Login" page
    Given user clicks "Signup / Login" button in header
    When user clicks "Home" button in header
    Then home page is shown
