export function getCurrentDate() {
  const date = new Date()
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

const telephoneNumberWhitelist = ['15052901933', '18502364628', '15935976295', '17623780429']

export function isTelephoneNumberWhitelist(tel: any) {
  return telephoneNumberWhitelist.includes(tel)
}
