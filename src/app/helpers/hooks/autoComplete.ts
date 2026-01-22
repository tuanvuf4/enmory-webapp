import { setting } from '@/config/appConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IExample } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { exampleApi } from '@/services/firebase/api/example.api'
import _ from 'lodash'
import { useState, useEffect } from 'react'

type searchType = 'item' | 'example'

interface Options {
  id?: string | number
  label: string
  value: string
}

export const useAutoComplete = (
  searchText: string,
  type: searchType = 'item',
  exact = false,
  timeout = setting.debounceTime,
) => {
  const [options, setOptions] = useState<Options[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    let handleSession: NodeJS.Timeout
    const query = {
      keyword: searchText,
      page: 0,
      size: setting.numberItemOfAutoComplete * 10,
    }
    if (searchText && searchText.length >= 2) {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        if (type === 'item') {
          itemApi
            .getItemAutoComplete(exact ? _.merge(query, { exact }) : query)
            .then((response: IHttpResponse<IItem<string>[]>) => {
              if (!response.content || response.content.length === 0) {
                setOptions([])
              }

              if (response.content && response.content.length > 0) {
                setOptions(
                  response.content.map((item) => ({
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
                response.content.map((meaning) => {
                  return {
                    id: meaning.id,
                    value: `${meaning.id}`,
                    label: meaning.origin,
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
  }, [searchText])

  return { options, isSearching }
}
