import { IHttpResponse } from '@/models/http.model'
import {
  ECategory,
  EType,
  IOption,
  IIotd,
  IIotdRequest,
  MarkIotdRangeDateRequest,
  GetIIotdRangeDateRequest,
} from '@/models/item.model'
import { getCategory, getTypeOfItem } from '@/helpers/item'

const enumValues = <T extends Record<string, unknown>>(enm: T) =>
  Object.values(enm).filter((v) => typeof v === 'number') as number[]

const getCategories = async (): Promise<IHttpResponse<IOption<string, ECategory>[]>> => {
  const cats = enumValues(ECategory)
    .filter((value) => value !== ECategory.ALL)
    .map((value) => ({
      id: value,
      label: getCategory(value as ECategory),
      value: value as ECategory,
      key: String(value),
    }))

  return {
    isSuccess: true,
    message: 'Fetched categories from Firebase enum',
    content: cats,
    statusCode: 200,
  }
}

const getTypes = async (): Promise<IHttpResponse<IOption<string, EType>[]>> => {
  const types = enumValues(EType)
    .filter((value) => value !== EType.ALL)
    .map((value) => {
      const { origin } = getTypeOfItem(value as EType)
      return {
        id: value,
        label: origin,
        value: value as EType,
        key: String(value),
      }
    })

  return {
    isSuccess: true,
    message: 'Fetched types from Firebase enum',
    content: types,
    statusCode: 200,
  }
}

const unsupported = (name: string) => ({
  isSuccess: false,
  message: `${name} is not supported in Firebase mode`,
  content: null as unknown as IIotd<string>,
  statusCode: 501,
})

const getItemOfTheDayByCatId = async (_body: IIotdRequest) => unsupported('IOTD fetch')

const markIotd = async (_body: MarkIotdRangeDateRequest) => unsupported('IOTD mark')

const getIotdRange = async (_body: GetIIotdRangeDateRequest) => unsupported('IOTD range')

const deleteMarkIotd = async (_id: string) => unsupported('IOTD delete')

export const commonApi = {
  getCategories,
  getTypes,
  getItemOfTheDayByCatId,
  markIotd,
  getIotdRange,
  deleteMarkIotd,
}
