export const patternValidation = {
  emailPattern: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
  phoneNumberPattern: /(^0+[0-9]{9})\b/,
  agencyPhoneNumberPattern: /(^0+[0-9]{9,10})\b/,
  namePattern: /([A-zÀ-Ỹ,',-]{1,}(\\D+){0,} (\\D+){0,}[,',-,A-zÀ-Ỹ]{1,}){1,}/gi,
  inviteCodePattern: /^[0-9]{6}$/,
  CCCDPattern: /^[0-9]{12}$/,
  IDPattern: /^[0-9]{12}$/,
  isEmptyValue: /^(?!\\s*$).+/,
  referralCodePattern: /^[0-9]{6}$/,
  specialCharacterPattern: /[ `!@#$%^&*()_+=\[\]{};:\\|,.<>\/?~]/g,
  specialCharacterPronouns: /[`_+=\[\]{}\\/0-9]/g,
}
