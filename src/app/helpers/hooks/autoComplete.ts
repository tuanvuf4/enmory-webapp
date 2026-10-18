import { appSetting } from '@/config/appConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IExample } from '@/models/item.model'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { exampleApi } from '@/services/firebase/api/example.api'
import { tagApi } from '@/services/firebase/api/tag.api'
import { localDb, queryLocalItems } from '@/services/localDb'
import { firebaseAuthService } from '@/services/firebase/authService'
import _ from 'lodash'
import { useState, useEffect } from 'react'
import { BaseOptionType } from 'antd/es/select'

type searchType = 'item' | 'example' | 'tag'

export const useAutoComplete = (
  filters: Partial<IItemRequestParams> = {},
  type: searchType = 'item',
  exact = false,
  timeout = appSetting.debounceTime,
) => {
  const [options, setOptions] = useState<BaseOptionType[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const filterKey = JSON.stringify(filters)

  const { keyword } = filters

  useEffect(() => {
    let handleSession: NodeJS.Timeout
    const payload = {
      ...filters,
      keyword: keyword || '',
      page: 0,
      size: appSetting.numberItemOfAutoComplete * 2,
    }

    if (!keyword) {
      setOptions([])
      setIsSearching(false)
      return
    }

    if (type === 'tag') {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        tagApi
          .getTags(keyword || '')
          .then((response) => {
            if (response.content && response.content.length > 0) {
              setOptions(
                response.content.map((tag) => ({
                  id: tag.id,
                  label: tag.value,
                  value: tag.value,
                })),
              )
            } else setOptions([])
          })
          .catch((err) => {
            console.error('Error fetching tags:', err)
            setOptions([])
          })
          .finally(() => {
            setIsSearching(false)
          })
      }, timeout)
    } else if (keyword.length >= 2) {
      handleSession = setTimeout(async () => {
        setIsSearching(true)
        if (type === 'item') {
          try {
            const user = firebaseAuthService.getCurrentUser()
            if (user?.uid) {
              const localCount = await localDb.items.where('uid').equals(user.uid).count()
              if (localCount > 0) {
                const res = await queryLocalItems({ ...payload, exact }, user.uid)
                if (res.content && res.content.length > 0) {
                  setOptions(
                    res.content.slice(0, appSetting.numberItemOfAutoComplete).map((item) => ({
                      id: item.id,
                      label: item.origin,
                      value: item.origin,
                    })),
                  )
                } else {
                  setOptions([])
                }
                setIsSearching(false)
                return
              }
            }
          } catch (e) {
            console.warn('Local autocomplete search error, falling back to Firestore:', e)
          }

          itemApi
            .getItemAutoComplete({ ...payload, exact })
            .then((response: IHttpResponse<IItem[]>) => {
              if (response.content && response.content.length > 0) {
                setOptions(
                  response.content.map((item) => ({
                    id: item.id,
                    label: item.origin,
                    value: item.origin,
                  })),
                )
              } else setOptions([])
            })
            .catch((err) => {
              console.error('Error fetching item autocomplete:', err)
              setOptions([])
            })
            .finally(() => {
              setIsSearching(false)
            })
        } else if (type === 'example') {
          exampleApi
            .getExamples(payload)
            .then((response: IHttpResponse<IExample[]>) => {
              if (response.content && response.content.length > 0) {
                setOptions(
                  response.content.map((example) => {
                    return {
                      id: `${example.id}`,
                      value: example.origin,
                      label: example.origin,
                    }
                  }),
                )
              } else setOptions([])
            })
            .catch((err) => {
              console.error('Error fetching example autocomplete:', err)
              setOptions([])
            })
            .finally(() => {
              setIsSearching(false)
            })
        }
      }, timeout)
    } else {
      setOptions([])
      setIsSearching(false)
    }

    return () => {
      clearTimeout(handleSession)
    }
  }, [keyword, exact, filterKey, type, timeout])

  return {
    options,
    isSearching,
    isExisted: options.length > 0 && options.findIndex((item) => item.value === keyword) > -1,
  }
}
