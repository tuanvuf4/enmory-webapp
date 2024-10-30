import { defaultSetting } from "@config/appConfig"
import { ELoading } from "@models/app.model"
import { IHttpResponse, IHttpResponseArray } from "@models/http.model"
import { IItem, IExample } from "@models/item.model"
import { exampleApi } from "@services/api/example.api"
import { itemApi } from "@services/api/item.api"
import _ from "lodash"
import { useState, useEffect } from "react"

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
  timeout = defaultSetting.debounceTime,
) => {
  const [options, setOptions] = useState<Options[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    let handleSession: NodeJS.Timeout
    const query = {
      keyword: searchText,
      page: 0,
      size: defaultSetting.numberItemOfAutoComplete * 2,
    }
    if (searchText && searchText.length >= 2) {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        if (type === 'item') {
          itemApi
            .getItemAutoComplete(exact ? _.merge(query, { exact }) : query, {
              headers: { loading: ELoading.NO },
            })
            .then((response: IHttpResponse<IHttpResponseArray<IItem<string>>>) => {
              setOptions(
                response.content.data.map((item) => ({
                  label: item.original,
                  value: item.original,
                })),
              )
            })
            .finally(() => {
              setIsSearching(false)
            })
        }

        if (type === 'example') {
          exampleApi
            .getExamples(query, {
              headers: { loading: ELoading.NO },
            })
            .then((response: IHttpResponse<IHttpResponseArray<IExample>>) => {
              setOptions(
                response.content.data.map((meaning) => {
                  return {
                    id: meaning.id,
                    value: `${meaning.id}`,
                    label: meaning.original,
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
