/*
 * NOTE: #000 not work
 */
export const hex2Rgba = (hex: string, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16)

  if (alpha) {
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
  } else {
    return 'rgb(' + r + ', ' + g + ', ' + b + ')'
  }
}

export function rgbaHex(r: number, g: number, b: number, a?: number) {
  function valueToHex(r: number, g: number, b: number, a?: number) {
    if (r > 255 || g > 255 || b > 255 || (a && a > 255)) throw 'Invalid color component'

    if (a) {
      return (
        '#' +
        (256 + r).toString(16).substr(1) +
        (((1 << 24) + (g << 16)) | (b << 8) | a).toString(16).substr(1)
      )
    }

    return (
      '#' +
      (256 + r).toString(16).substr(1) +
      (((1 << 24) + (g << 16)) | (b << 8)).toString(16).substr(1)
    )
  }

  if (!a) {
    return valueToHex(r, g, b)
  }
  return valueToHex(r, g, b, a)
}
