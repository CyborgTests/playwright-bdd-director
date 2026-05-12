import { faker } from '@faker-js/faker'
import { test } from '@playwright/test'

import { TAG } from '../../src/constants/tags'
import { TodoPage } from '../../src/pages/TodoPage'

test.describe('[TS01] TodoMVC Tests', { tag: [TAG.TEST.AUTO, TAG.SUITE.TODO] }, () => {
  let todoPage: TodoPage

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page)
  })

  test('[TC01-01-AUTO-UI] Add todo', async () => {
    const todoText = faker.helpers.arrayElement([
      faker.commerce.productName(),
      `Buy ${faker.commerce.product()}`,
      faker.hacker.phrase(),
      `${faker.word.verb()} ${faker.word.noun()}`
    ])

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add new todo', async () => {
      await todoPage.addTodo(todoText)
    })

    await test.step('Verify todo created', async () => {
      await todoPage.expectTodoText(todoText)
    })
  })

  test('[TC01-02-AUTO-UI] Complete todo', async () => {
    const todoText = faker.word.words(2)

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add new todo', async () => {
      await todoPage.addTodo(todoText)
    })

    await test.step('Mark todo as completed', async () => {
      await todoPage.toggleTodo()
    })

    await test.step('Verify todo is completed', async () => {
      await todoPage.expectTodoCompleted()
    })
  })

  test('[TC01-03-AUTO-UI] Delete todo', async () => {
    const todoText = faker.lorem.sentence({ min: 2, max: 4 })

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add new todo', async () => {
      await todoPage.addTodo(todoText)
    })

    await test.step('Hover over todo and click delete button', async () => {
      await todoPage.deleteTodo()
    })

    await test.step('Verify todo deleted', async () => {
      await todoPage.expectTodoCount(0)
    })
  })

  test('[TC01-04-AUTO-UI] Clear completed todos', async () => {
    const todoText = faker.company.catchPhrase()

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add new todo', async () => {
      await todoPage.addTodo(todoText)
    })

    await test.step('Mark todo as completed', async () => {
      await todoPage.toggleTodo()
    })

    await test.step('Click "Clear completed"', async () => {
      await todoPage.clearCompleted()
    })

    await test.step('Verify todo deleted', async () => {
      await todoPage.expectTodoCount(0)
    })
  })

  test('[TC01-05-AUTO-UI] Verify item counter', async () => {
    const firstTodo = faker.food.dish()
    const secondTodo = faker.food.dish()

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add first todo', async () => {
      await todoPage.addTodo(firstTodo)
    })

    await test.step('Add second todo', async () => {
      await todoPage.addTodo(secondTodo)
    })

    await test.step('Mark second todo as completed', async () => {
      await todoPage.toggleTodo(1)
    })

    await test.step('Verify counter shows "1 item left"', async () => {
      await todoPage.expectItemsLeft(1)
    })
  })
})
