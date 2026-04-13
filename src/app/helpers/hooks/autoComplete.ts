import { appSetting } from '@/config/appConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IExample } from '@/models/item.model'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { exampleApi } from '@/services/firebase/api/example.api'
import _ from 'lodash'
import { useState, useEffect } from 'react'
import { BaseOptionType } from 'antd/es/select'

type searchType = 'item' | 'example'

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

    if (!keyword) return setOptions([])

    if (keyword && keyword.length >= 2) {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        if (type === 'item') {
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
            .finally(() => {
              setIsSearching(false)
            })
        }

        if (type === 'example') {
          exampleApi
            .getExamples(payload)
            .then((response: IHttpResponse<IExample[]>) => {
              if (response.content && response.content.length > 0) {
                setOptions(
                  response.content.map((example) => {
                    return {
                      id: `${example.id}`,
                      value: `${example.id}`,
                      label: example.origin,
                    }
                  }),
                )
              } else setOptions([])
            })
            .finally(() => {
              setIsSearching(false)
            })
        }
      }, timeout)
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
