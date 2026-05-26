import { type Locator, type Page } from '@playwright/test'

import { TestUser } from '@/schemas/auth.types'

import { BasePage } from './BasePage'

export class SignupPage extends BasePage {
  private readonly titleMrRadio: Locator
  private readonly titleMrsRadio: Locator
  private readonly passwordInput: Locator
  private readonly birthDaySelect: Locator
  private readonly birthMonthSelect: Locator
  private readonly birthYearSelect: Locator
  private readonly firstNameInput: Locator
  private readonly lastNameInput: Locator
  private readonly address1Input: Locator
  private readonly countrySelect: Locator
  private readonly stateInput: Locator
  private readonly cityInput: Locator
  private readonly zipcodeInput: Locator
  private readonly mobileNumberInput: Locator
  private readonly createAccountBtn: Locator

  private readonly monthMap: Record<string, string> = {
    Jan: 'January',
    Feb: 'February',
    Mar: 'March',
    Apr: 'April',
    May: 'May',
    Jun: 'June',
    Jul: 'July',
    Aug: 'August',
    Sep: 'September',
    Oct: 'October',
    Nov: 'November',
    Dec: 'December'
  }

  constructor(page: Page) {
    super(page, '/signup')
    this.passwordInput = this.page.locator('[data-qa="password"]')
    this.titleMrRadio = this.page.getByLabel('Mr.')
    this.titleMrsRadio = this.page.getByLabel('Mrs.')
    this.birthDaySelect = this.page.locator('[data-qa="days"]')
    this.birthMonthSelect = this.page.locator('[data-qa="months"]')
    this.birthYearSelect = this.page.locator('[data-qa="years"]')
    this.firstNameInput = this.page.locator('[data-qa="first_name"]')
    this.lastNameInput = this.page.locator('[data-qa="last_name"]')
    this.address1Input = this.page.locator('[data-qa="address"]')
    this.countrySelect = this.page.locator('[data-qa="country"]')
    this.stateInput = this.page.locator('[data-qa="state"]')
    this.cityInput = this.page.locator('[data-qa="city"]')
    this.zipcodeInput = this.page.locator('[data-qa="zipcode"]')
    this.mobileNumberInput = this.page.locator('[data-qa="mobile_number"]')
    this.createAccountBtn = this.page.locator('[data-qa="create-account"]')
  }

  async registerUser(user: TestUser): Promise<void> {
    if (user.title === 'Mr') {
      await this.titleMrRadio.check()
    } else {
      await this.titleMrsRadio.check()
    }
    await this.passwordInput.fill(user.password)
    await this.birthDaySelect.selectOption(user.birth_day)

    const fullMonthName = this.monthMap[user.birth_month] || user.birth_month
    await this.birthMonthSelect.selectOption(fullMonthName)

    await this.birthYearSelect.selectOption(user.birth_year)
    await this.firstNameInput.fill(user.firstname)
    await this.lastNameInput.fill(user.lastname)
    await this.address1Input.fill(user.address1)
    await this.countrySelect.selectOption(user.country)
    await this.stateInput.fill(user.state)
    await this.cityInput.fill(user.city)
    await this.zipcodeInput.fill(user.zipcode)
    await this.mobileNumberInput.fill(user.mobile_number)
  }

  async clickCreateAccountBtn(): Promise<void> {
    await this.createAccountBtn.click()
  }
}
