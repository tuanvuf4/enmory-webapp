import React from 'react'
import { appSetting } from '@/config/appConfig'
import { IHttpResponse } from '@/models/http.model'
import { IItem, IExample } from '@/models/item.model'
import { itemApi, IItemRequestParams } from '@/services/firebase/api/item.api'
import { exampleApi } from '@/services/firebase/api/example.api'
import { tagApi } from '@/services/firebase/api/tag.api'
import {
  localDb,
  queryLocalItems,
  cleanSearchText,
  findBestMatchingMeaning,
} from '@/services/localDb'
import { firebaseAuthService } from '@/services/firebase/authService'
import { getType } from '@/helpers/item'
import { useState, useEffect } from 'react'
import { BaseOptionType } from 'antd/es/select'

type searchType = 'item' | 'example' | 'tag'

const mapItemToOption = (item: IItem, kw: string): BaseOptionType => {
  const matchedMeaning = findBestMatchingMeaning(item, kw)
  const typeInfo = matchedMeaning ? getType(matchedMeaning.typeId) : null
  const typeAbbr = typeInfo && typeInfo.abbr !== 'all' ? typeInfo.abbr : ''
  const cleanTrans = cleanSearchText(
    matchedMeaning?.translation || item.meanings?.[0]?.translation || '',
  )
  const cleanDef = cleanSearchText(
    matchedMeaning?.definition || item.meanings?.[0]?.definition || '',
  )

  return {
    id: item.id,
    value: item.origin,
    origin: item.origin,
    translation: cleanTrans,
    definition: cleanDef,
    typeAbbr,
    item,
    label: React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          padding: '2px 0',
          lineHeight: 1.3,
          maxWidth: '100%',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          },
        },
        React.createElement(
          'span',
          { style: { fontWeight: 600, fontSize: '13.5px' } },
          item.origin,
        ),
        typeAbbr
          ? React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontStyle: 'italic',
                  opacity: 0.65,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(128, 128, 128, 0.12)',
                  textTransform: 'lowercase',
                },
              },
              typeAbbr,
            )
          : null,
      ),
      cleanTrans || cleanDef
        ? React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            cleanTrans
              ? React.createElement(
                  'span',
                  {
                    style: {
                      color: '#1677ff',
                      fontWeight: 500,
                      flexShrink: 0,
                      maxWidth: '70%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  cleanTrans,
                )
              : null,
            cleanDef
              ? React.createElement(
                  'span',
                  {
                    style: {
                      opacity: 0.65,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '11.5px',
                    },
                  },
                  cleanTrans ? `• ${cleanDef}` : cleanDef,
                )
              : null,
          )
        : null,
    ),
  }
}

const mapExampleToOption = (example: IExample): BaseOptionType => {
  const cleanOrig = cleanSearchText(example.origin || '')
  const cleanTrans = cleanSearchText(example.translation || '')
  return {
    id: `${example.id}`,
    value: cleanOrig,
    origin: cleanOrig,
    translation: cleanTrans,
    label: cleanTrans
      ? React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '2px 0',
              lineHeight: 1.3,
            },
          },
          React.createElement('div', { style: { fontWeight: 500, fontSize: '13px' } }, cleanOrig),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '11.5px',
                color: '#1677ff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            cleanTrans,
          ),
        )
      : cleanOrig,
  }
}

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
    const trimmedKeyword = (keyword || '').trim()
    const payload = {
      ...filters,
      keyword: trimmedKeyword,
      page: 0,
      size: appSetting.numberItemOfAutoComplete * 2,
    }

    if (!trimmedKeyword) {
      setOptions([])
      setIsSearching(false)
      return
    }

    if (type === 'tag') {
      handleSession = setTimeout(() => {
        setIsSearching(true)
        tagApi
          .getTags(trimmedKeyword)
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
    } else if (trimmedKeyword.length >= 1) {
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
                    res.content
                      .slice(0, appSetting.numberItemOfAutoComplete)
                      .map((item) => mapItemToOption(item, trimmedKeyword)),
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
                  response.content
                    .slice(0, appSetting.numberItemOfAutoComplete)
                    .map((item) => mapItemToOption(item, trimmedKeyword)),
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
                  response.content
                    .slice(0, appSetting.numberItemOfAutoComplete)
                    .map((example) => mapExampleToOption(example)),
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
