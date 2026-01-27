import { IFormSearchItem } from '@/models/index'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export const useItemSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [urlParams, setParams] = useState<IFormSearchItem>()

  useEffect(() => {
    setParams({
      keyword: searchParams.get('keyword') || '',
      cat:
        searchParams.get('cat') && searchParams.get('cat') !== '0'
          ? Number(searchParams.get('cat'))
          : 0,
      archive: searchParams.get('archive') === 'true',
      favorite: searchParams.get('favorite') === 'true',
      order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
      orderBy: (searchParams.get('orderBy') as 'created_date' | 'last_update') || 'created_date',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
      size: searchParams.get('size') ? Number(searchParams.get('size')) : 20,
    })
  }, [searchParams])

  const setUrlParams = (data: Partial<IFormSearchItem>, resetPage: boolean = true) => {
    const params = new URLSearchParams(searchParams)

    // Reset page to 0 when filters change (unless explicitly disabled)
    if (resetPage) {
      params.set('page', '0')
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })
    setSearchParams(params)
  }

  return { urlParams, setUrlParams }
}
