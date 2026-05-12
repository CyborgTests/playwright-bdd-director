import { expect, type Locator, type Page } from '@playwright/test'

export class TodoPage {
  private readonly page: Page
  private readonly newTodoInput: Locator
  private readonly todoItems: Locator
  private readonly clearCompletedBtn: Locator
  private readonly todoCount: Locator

  constructor(page: Page) {
    this.page = page
    this.newTodoInput = page.locator('.new-todo')
    this.todoItems = page.locator('.todo-list li')
    this.clearCompletedBtn = page.locator('.clear-completed')
    this.todoCount = page.locator('.todo-count')
  }

  async goto() {
    await this.page.goto('')
  }

  async addTodo(text: string) {
    await this.newTodoInput.fill(text)
    await this.newTodoInput.press('Enter')
  }

  async toggleTodo(index: number = 0) {
    await this.todoItems.nth(index).locator('.toggle').click()
  }

  async deleteTodo(index: number = 0) {
    const todo = this.todoItems.nth(index)
    await todo.hover()
    await todo.locator('.destroy').click()
  }

  async clearCompleted() {
    await this.clearCompletedBtn.click()
  }

  // Expectations for automated tests
  async expectTodoText(text: string, index: number = 0) {
    await expect.soft(this.todoItems.nth(index).locator('label')).toHaveText(text)
  }

  async expectTodoCompleted(index: number = 0) {
    await expect.soft(this.todoItems.nth(index)).toHaveClass(/completed/)
  }

  async expectTodoCount(count: number) {
    await expect.soft(this.todoItems).toHaveCount(count)
  }

  async expectItemsLeft(count: number) {
    const text = count === 1 ? '1 item left' : `${count} items left`
    await expect.soft(this.todoCount).toHaveText(text)
  }
}
