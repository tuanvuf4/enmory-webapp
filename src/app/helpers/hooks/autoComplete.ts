import { setting } from '@/config/appConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IExample } from '@/models/item.model'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { exampleApi } from '@/services/firebase/api/example.api'
import _ from 'lodash'
import { useState, useEffect } from 'react'
import { BaseOptionType } from 'antd/es/select'

type searchType = 'item' | 'example'

export const useAutoComplete = (
  keyword: string,
  type: searchType = 'item',
  exact = false,
  filters: Partial<IItemRequestParams> = {},
  timeout = setting.debounceTime,
) => {
  const [options, setOptions] = useState<BaseOptionType[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    let handleSession: NodeJS.Timeout
    const query = {
      ...filters,
      keyword,
      page: 0,
      size: setting.numberItemOfAutoComplete * 2,
    }
    if (keyword && keyword.length >= 2) {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        if (type === 'item') {
          itemApi
            .getItemAutoComplete({ ...query, exact })
            .then((response: IHttpResponse<IItem<string>[]>) => {
              if (!response.content || response.content.length === 0) {
                setOptions([])
              }

              if (response.content && response.content.length > 0) {
                setOptions(
                  response.content.map((item) => ({
                    id: item.id,
                    label: item.origin,
                    value: item.origin,
                  })),
                )
              }
            })
            .finally(() => {
              setIsSearching(false)
            })
        }

        if (type === 'example') {
          exampleApi
            .getExamples(query)
            .then((response: IHttpResponse<IExample[]>) => {
              if (!response.content || response.content.length === 0) {
                setOptions([])
                return
              }
              setOptions(
                response.content.map((example) => {
                  return {
                    id: `${example.id}`,
                    value: `${example.id}`,
                    label: example.origin,
                  }
                }),
              )
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

  return { options, isSearching }
}
