import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export interface ContactMessage {
  name: string
  email: string
  subject: string
  text: string
}

export class ContactUsPage extends BasePage {
  private readonly nameInput: Locator
  private readonly emailInput: Locator
  private readonly subjectInput: Locator
  private readonly messageInput: Locator
  private readonly attachmentInput: Locator
  private readonly submitBtn: Locator
  private readonly successMsg: Locator

  constructor(page: Page) {
    super(page, '/contact_us')
    this.nameInput = this.page.locator('[data-qa="name"]')
    this.emailInput = this.page.locator('[data-qa="email"]')
    this.subjectInput = this.page.locator('[data-qa="subject"]')
    this.messageInput = this.page.locator('[data-qa="message"]')
    this.attachmentInput = this.page.locator('#contact-us-form input[name="upload_file"]')
    this.submitBtn = this.page.locator('[data-qa="submit-button"]')
    this.successMsg = this.page.locator('#contact-page .status.alert-success')
  }

  async navigateToContactUs(): Promise<void> {
    await this.goto()
  }

  async fillMessage(message: ContactMessage): Promise<void> {
    await this.nameInput.fill(message.name)
    await this.emailInput.fill(message.email)
    await this.subjectInput.fill(message.subject)
    await this.messageInput.fill(message.text)
  }

  async attachFile(filePath: string): Promise<void> {
    await this.attachmentInput.setInputFiles(filePath)
  }

  async clickSubmit(): Promise<void> {
    // Submit asks "Press OK to proceed!" in a confirm dialog
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.submitBtn.click()
  }

  async expectSubmitted(): Promise<void> {
    await expect
      .soft(this.successMsg)
      .toHaveText('Success! Your details have been submitted successfully.')
  }
}
