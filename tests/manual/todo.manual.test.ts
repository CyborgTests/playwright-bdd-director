import test from "@cyborgtests/test";
import { TodoPage } from "../../src/pages/TodoPage";

test.describe("TodoMVC Tests", () => {
  let todoPage: TodoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
  });

  test("[TC01-01-MANUAL] Add todo", async ({ page, manualStep }) => {
    await test.step("[01-01-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });
    await manualStep("[01-01-02] Add new todo");
    await manualStep("[01-01-03] Verify todo created");
  });

  test("[TC01-02-MANUAL] Complete todo", async ({ page, manualStep }) => {
    await test.step("[01-02-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });
    await manualStep("[01-02-02] Add new todo");
    await manualStep("[01-02-03] Mark todo as completed");
    await manualStep("[01-02-04] Verify todo is completed");
  });

  test("[TC01-03-MANUAL] Delete todo", async ({ page, manualStep }) => {
    await test.step("[01-03-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });
    await manualStep("[01-03-02] Add new todo");
    await manualStep("[01-03-03] Hover over todo and click delete button");
    await manualStep("[01-03-04] Verify todo deleted");
  });

  test("[TC01-04-MANUAL] Clear completed todos", async ({
    page,
    manualStep,
  }) => {
    await test.step("[01-04-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });
    await manualStep("[01-04-02] Add new todo");
    await manualStep("[01-04-03] Mark todo as completed");
    await manualStep('[01-04-04] Click "Clear completed"');
    await manualStep("[01-04-05] Verify todo deleted");
  });

  test("[TC01-05-MANUAL] Verify item counter", async ({ page, manualStep }) => {
    await test.step("[01-05-01] Navigate to TodoMVC", async () => {
      await todoPage.goto();
    });
    await manualStep("[01-05-02] Add first todo");
    await manualStep("[01-05-03] Add second todo");
    await manualStep("[01-05-04] Mark second todo as completed");
    await manualStep('[01-05-05] Verify counter shows "1 item left"');
  });
});
