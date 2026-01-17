import { IHttpResponse } from '@/models/http.model'
import {
  ECategory,
  EType,
  IPair,
  IIotd,
  IIotdRequest,
  MarkIotdRangeDateRequest,
  GetIIotdRangeDateRequest,
} from '@/models/item.model'
import { getCategory, getTypeOfItem } from '@/helpers/item'
import { IUserConfig } from '@/models/user.model'
import { collection, getDocs, query, QueryConstraint, where } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { IUserProfile } from '../authService'

const enumValues = <T extends Record<string, unknown>>(enm: T) =>
  Object.values(enm).filter((v) => typeof v === 'number') as number[]

const getCategories = async (): Promise<IHttpResponse<IPair<string, ECategory>[]>> => {
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

const getTypes = async (): Promise<IHttpResponse<IPair<string, EType>[]>> => {
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

const deleteMarkIotd = async (_id: number) => unsupported('IOTD delete')

const getUserConfig = async (userId: string) => {
  try {
    const constraints: QueryConstraint[] = []
    constraints.push(where('userId', '==', userId))

    const userConfigQuery = query(collection(db, dbCollections.configuration), ...constraints)
    const snapshot = await getDocs(userConfigQuery)

    console.log(`*** snapshot *** `, snapshot.data())

    if (snapshot.exists()) {
      console.log(`*** userDoc.data() *** `, snapshot.data())
      return snapshot.data() as IUserProfile
    }
    return null
  } catch (error) {
    console.error('Error getting user config:', error)
    return null
  }
}

export const commonApi = {
  getCategories,
  getTypes,
  getItemOfTheDayByCatId,
  markIotd,
  getIotdRange,
  deleteMarkIotd,
  getUserConfig,
}
