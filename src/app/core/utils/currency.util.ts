export const formatCurrency = (num: number | bigint): string => {
  if (!num) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

export const getPriceByDiscount = (price: number, discount: number): number => {
  return price - (price * discount) / 100
}

export const filterCurrency = (formatCurrency: string, currency = '', symbol = '') => {
  switch (currency.toLowerCase()) {
    case 'vnd':
      return formatCurrency + ' ' + symbol

    default:
      return symbol + ' ' + formatCurrency
  }
}

export const formatCurrencyV2 = (currencySymbol = '$', separator = '.') => {
  return function (value: number) {
    const wholePart = Math.trunc(value / 100)
    let fractionalPart: string | number = value % 100
    if (fractionalPart < 10) {
      fractionalPart = '0' + fractionalPart
    }
    return `${currencySymbol}${wholePart}${separator}${fractionalPart}`
  }
}
