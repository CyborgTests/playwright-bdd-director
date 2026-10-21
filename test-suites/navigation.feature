Feature: Site Navigation
  Open key pages of AutomationExercise from the header

  Background:
    Given user opens the home page

  Scenario: Open "Signup / Login" page from header
    When user clicks "Signup / Login" button in header
    Then "Login to your account" form is visible
    And "New User Signup!" form is visible

  Scenario: Return to home page from "Signup / Login" page
    Given user clicks "Signup / Login" button in header
    When user clicks "Home" button in header
    Then home page is shown
