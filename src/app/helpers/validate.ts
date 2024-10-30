export const isGroupWord = (group: string) => {
  return group.trim().split(' ').length > 1 ? true : false
}

export function getRandomArrayIndex(array: unknown[], num: number) {
  const min = 1
  const max = array.length
  const tmp: number[] = []
  for (let index = 0; index < num; ) {
    const randomInt = Math.floor(Math.random() * (max - min + 1)) + min
    if (tmp.findIndex((item) => item === randomInt) === -1) {
      tmp.push(randomInt)
      index++
    }
  }
  return tmp.sort((a, b) => a - b)
}
