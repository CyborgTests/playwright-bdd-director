import test from '@cyborgtests/test'

import { TAG } from '../../src/constants/tags'
import { TodoPage } from '../../src/pages/TodoPage'

test.describe('[TS01] TodoMVC Tests', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TODO] }, () => {
  let todoPage: TodoPage

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page)
  })

  test('[TC01-01-MANUAL] Add todo', async ({ manualStep }) => {
    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })
    await manualStep('Add new todo')
    await manualStep('Verify todo created')
  })

  test('[TC01-02-MANUAL] Complete todo', async ({ manualStep }) => {
    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })
    await manualStep('Add new todo')
    await manualStep('Mark todo as completed')
    await manualStep('Verify todo is completed')
  })

  test('[TC01-03-MANUAL] Delete todo', async ({ manualStep }) => {
    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })
    await manualStep('Add new todo')
    await manualStep('Hover over todo and click delete button')
    await manualStep('Verify todo deleted')
  })

  test('[TC01-04-MANUAL] Clear completed todos', async ({ manualStep }) => {
    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })
    await manualStep('Add new todo')
    await manualStep('Mark todo as completed')
    await manualStep('Click "Clear completed"')
    await manualStep('Verify todo deleted')
  })

  test('[TC01-05-MANUAL] Verify item counter', async ({ manualStep }) => {
    await test.step('Navigate to TodoMVC', async () => {
      await todoPage.goto()
    })
    await manualStep('Add first todo')
    await manualStep('Add second todo')
    await manualStep('Mark second todo as completed')
    await manualStep('Verify counter shows "1 item left"')
  })
})
