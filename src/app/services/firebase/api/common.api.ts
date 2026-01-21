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
import { categories, types } from '@/constant/item'

const getCategories = async (): Promise<IHttpResponse<IOption<string, ECategory>[]>> => {
  return {
    isSuccess: true,
    message: 'Fetched categories from Firebase enum',
    content: categories,
    statusCode: 200,
  }
}

const getTypes = async (): Promise<
  IHttpResponse<IOption<{ origin: string; abbr: string }, EType>[]>
> => {
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
