@ui
Feature: Contact Us
  A suite migrated from Cucumber: its steps keep the World style (this) instead of fixtures

  Scenario: Send message with attachment
    Given user has written a message about "Order delivery"
    When user sends it with an attachment
    Then message is submitted
