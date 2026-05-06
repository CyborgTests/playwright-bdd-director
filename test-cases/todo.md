# [TS01] TodoMVC Tests

<!-- 
This file demonstrates MD Test Framework capabilities using Playwright's official TodoMVC demo.
You can add comments, test data, expected results, and detailed steps.
-->

## [TC01-01] Add todo

### [01-01-01] Navigate to TodoMVC

- Open browser
- Navigate to `https://demo.playwright.dev/todomvc/`
- Ensure todo input is visible

### [01-01-02] Add new todo

- **Test data:**
  - Todo text: `Buy groceries`
  - Enter text in `.new-todo` input field
  - Press Enter key

### [01-01-03] Verify todo created

- Check that todo appears in the list
- Verify todo text matches `Buy groceries`
- Confirm todo is not completed

## [TC01-02] Complete todo

### [01-02-01] Navigate to TodoMVC

- Open `https://demo.playwright.dev/todomvc/`

### [01-02-02] Add new todo

- **Test data:** `Task`
- Enter and submit

### [01-02-03] Mark todo as completed

- Click checkbox (`.toggle`) next to todo
- Visual: todo text should show strikethrough

### [01-02-04] Verify todo is completed

- **Expected:** Todo has `completed` class
  - Visual: strikethrough text style
  - Checkbox should be checked

## [TC01-03] Delete todo

### [01-03-01] Navigate to TodoMVC

- Open `https://demo.playwright.dev/todomvc/`

### [01-03-02] Add new todo

- **Test data:** `Delete me`

### [01-03-03] Hover over todo and click delete button

- Hover over the todo item
- Delete button (×) should become visible on the right
- Click the × button (`.destroy`)
- Todo should disappear with animation

### [01-03-04] Verify todo deleted

- **Expected:** Todo list is empty
- Counter shows "0 items left" or hidden

## [TC01-04] Clear completed todos

### [01-04-01] Navigate to TodoMVC

- Open `https://demo.playwright.dev/todomvc/`

### [01-04-02] Add new todo

- **Test data:** `Task`

### [01-04-03] Mark todo as completed

- Click checkbox
- Wait for completion animation

### [01-04-04] Click "Clear completed"

- **Element:** `.clear-completed` button at bottom right
- Button should be visible only when completed todos exist

### [01-04-05] Verify todo deleted

- **Expected:**
  - Todo list is empty
  - "Clear completed" button is hidden

## [TC01-05] Verify item counter

### [01-05-01] Navigate to TodoMVC

- Open `https://demo.playwright.dev/todomvc/`

### [01-05-02] Add first todo

- **Test data:** `First task`
- Counter should show "1 item left"

### [01-05-03] Add second todo

- **Test data:** `Second task`
- Counter should update to "2 items left"

### [01-05-04] Mark second todo as completed

- Click checkbox for second todo (`.todo-list li:nth-child(2) .toggle`)
- Completed todos don't count toward "items left"

### [01-05-05] Verify counter shows "1 item left"

- **Expected:** `.todo-count` shows exactly `1 item left`
  - First todo still active (unchecked)
  - Second todo completed (checked)
