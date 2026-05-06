import { test } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { TodoPage } from "../../src/pages/TodoPage";

test.describe("TodoMVC Tests", () => {
  let todoPage: TodoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
  });

  test("[TC01-01-AUTO-UI] Add todo", async ({ page }) => {
    const todoText = faker.helpers.arrayElement([
      faker.commerce.productName(),
      `Buy ${faker.commerce.product()}`,
      faker.hacker.phrase(),
      `${faker.word.verb()} ${faker.word.noun()}`,
    ]);

    await test.step("[01-01-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });

    await test.step("[01-01-02] Add new todo", async () => {
      await todoPage.addTodo(todoText);
    });

    await test.step("[01-01-03] Verify todo created", async () => {
      await todoPage.expectTodoText(todoText);
    });
  });

  test("[TC01-02-AUTO-UI] Complete todo", async ({ page }) => {
    const todoText = faker.word.words(2);

    await test.step("[01-02-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });

    await test.step("[01-02-02] Add new todo", async () => {
      await todoPage.addTodo(todoText);
    });

    await test.step("[01-02-03] Mark todo as completed", async () => {
      await todoPage.toggleTodo();
    });

    await test.step("[01-02-04] Verify todo is completed", async () => {
      await todoPage.expectTodoCompleted();
    });
  });

  test("[TC01-03-AUTO-UI] Delete todo", async ({ page }) => {
    const todoText = faker.lorem.sentence({ min: 2, max: 4 });

    await test.step("[01-03-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });

    await test.step("[01-03-02] Add new todo", async () => {
      await todoPage.addTodo(todoText);
    });

    await test.step("[01-03-03] Hover over todo and click delete button", async () => {
      await todoPage.deleteTodo();
    });

    await test.step("[01-03-04] Verify todo deleted", async () => {
      await todoPage.expectTodoCount(0);
    });
  });

  test("[TC01-04-AUTO-UI] Clear completed todos", async ({ page }) => {
    const todoText = faker.company.catchPhrase();

    await test.step("[01-04-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });

    await test.step("[01-04-02] Add new todo", async () => {
      await todoPage.addTodo(todoText);
    });

    await test.step("[01-04-03] Mark todo as completed", async () => {
      await todoPage.toggleTodo();
    });

    await test.step('[01-04-04] Click "Clear completed"', async () => {
      await todoPage.clearCompleted();
    });

    await test.step("[01-04-05] Verify todo deleted", async () => {
      await todoPage.expectTodoCount(0);
    });
  });

  test("[TC01-05-AUTO-UI] Verify item counter", async ({ page }) => {
    const firstTodo = faker.food.dish();
    const secondTodo = faker.food.dish();

    await test.step("[01-05-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });

    await test.step("[01-05-02] Add first todo", async () => {
      await todoPage.addTodo(firstTodo);
    });

    await test.step("[01-05-03] Add second todo", async () => {
      await todoPage.addTodo(secondTodo);
    });

    await test.step("[01-05-04] Mark second todo as completed", async () => {
      await todoPage.toggleTodo(1);
    });

    await test.step('[01-05-05] Verify counter shows "1 item left"', async () => {
      await todoPage.expectItemsLeft(1);
    });
  });
});
