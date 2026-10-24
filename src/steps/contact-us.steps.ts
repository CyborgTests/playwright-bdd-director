import fs from 'fs'
import os from 'os'
import path from 'path'

import { test } from '@/fixtures'
import { createBdd } from '@/framework/bdd'

/**
 * World style of a suite migrated from Cucumber (docs/step-definitions.md, "From Cucumber: World
 * style"): steps are `function`s on `this` - the contactUsWorld fixture. New steps use fixtures.
 */
const { Given, When, Then, BeforeAll, AfterAll } = createBdd(test, { world: 'contactUsWorld' })

// One file per worker: the hooks below create and remove it around the suite
const attachmentPath = path.join(os.tmpdir(), `contact-us-attachment-${process.pid}.txt`)

BeforeAll({ name: 'Create attachment', tags: '@contact-us' }, async () => {
  await fs.promises.writeFile(attachmentPath, 'Order details for the support team\n')
})

AfterAll({ name: 'Remove attachment', tags: '@contact-us' }, async () => {
  await fs.promises.rm(attachmentPath, { force: true })
})

Given('user has written a message about {string}', async function (subject: string) {
  this.writeMessage(subject)
  await this.contactUsPage.navigateToContactUs()
})

When('user sends it with an attachment', async function () {
  if (!this.message) throw new Error('No message written - the scenario needs a Given step first')
  await this.contactUsPage.fillMessage(this.message)
  await this.contactUsPage.attachFile(attachmentPath)
  await this.contactUsPage.clickSubmit()
})

Then('message is submitted', async function () {
  await this.contactUsPage.expectSubmitted()
})
