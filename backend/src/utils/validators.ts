export const isValidCountryCode = (code: string): boolean => {
  return /^[A-Z]{2}$/i.test(code)
}
