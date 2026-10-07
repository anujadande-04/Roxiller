const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/

export function validateUser(input, { passwordRequired = true } = {}) {
  const errors = {}
  const name = String(input.name || '').trim()
  const address = String(input.address || '').trim()
  const email = String(input.email || '').trim().toLowerCase()
  if (name.length < 20 || name.length > 60) errors.name = 'Name must be between 20 and 60 characters.'
  if (address.length > 400) errors.address = 'Address must be 400 characters or fewer.'
  if (!address) errors.address = 'Address is required.'
  if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (passwordRequired && !passwordPattern.test(String(input.password || ''))) errors.password = 'Password must be 8-16 characters with an uppercase letter and special character.'
  return { errors, value: { name, address, email, password: String(input.password || '') } }
}

export function validateRating(value) {
  const rating = Number(value)
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null
}

export { passwordPattern }
