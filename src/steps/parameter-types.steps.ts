import { defineParameterType } from '@/framework/bdd'

/**
 * Parameter types of the shop steps - a steps file, so the Cucumber extension finds them too;
 * step files using one import it first
 */

// "Rs. 1500" in a step is an amount: steps get the number, the shop format stays in one place
defineParameterType({
  name: 'price',
  regexp: /Rs\. \d+/,
  transformer: (text: string) => Number(text.slice('Rs. '.length))
})
