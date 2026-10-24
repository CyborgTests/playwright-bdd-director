import { faker } from '@faker-js/faker'

import { type ContactMessage, ContactUsPage } from '@/pages/ContactUsPage'

import { test as base } from './base.fixture'

/**
 * Cucumber World of the contact-us suite: steps share the page and the message through `this`
 * (src/steps/contact-us.steps.ts, the World style of migrated Cucumber suites)
 */
export class ContactUsWorld {
  message?: ContactMessage

  constructor(readonly contactUsPage: ContactUsPage) {}

  writeMessage(subject: string): ContactMessage {
    this.message = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      subject,
      text: faker.lorem.sentences(2)
    }
    return this.message
  }
}

interface ContactUsFixture {
  contactUsWorld: ContactUsWorld
}

export const test = base.extend<ContactUsFixture>({
  contactUsWorld: async ({ page }, use) => {
    await use(new ContactUsWorld(new ContactUsPage(page)))
  }
})
