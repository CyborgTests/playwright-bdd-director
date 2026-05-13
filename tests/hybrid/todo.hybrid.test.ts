import test from '@cyborgtests/test'
import { faker } from '@faker-js/faker'

import { TAG } from '@/constants/tags'
import { TodoPage } from '@/pages/TodoPage'

test.describe('[TS01] TodoMVC Tests', { tag: [TAG.TEST.HYBRID, TAG.SUITE.TODO] }, () => {
  let todoPage: TodoPage

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page)
  })

  test('[TC01-01-HYBRID] Add todo', async ({ manualStep }) => {
    const todoText = faker.helpers.arrayElement([
      faker.commerce.productName(),
      `Buy ${faker.commerce.product()}`,
      faker.hacker.phrase()
    ])

    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })

    await test.step('Add new todo', async () => {
      await todoPage.addTodo(todoText)
    })

    await manualStep('Verify todo created')
  })

  test('[TC01-02-HYBRID] Complete todo', async ({ manualStep }) => {
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

    await manualStep('Verify todo is completed')
  })

  test('[TC01-03-HYBRID] Delete todo', async ({ manualStep }) => {
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

    await manualStep('Verify todo deleted')
  })

  test('[TC01-04-HYBRID] Clear completed todos', async ({ manualStep }) => {
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

    await manualStep('Verify todo deleted')
  })

  test('[TC01-05-HYBRID] Verify item counter', async ({ manualStep }) => {
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

    await manualStep('Verify counter shows "1 item left"')
  })
})
