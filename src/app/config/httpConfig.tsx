export const httpConfig = {
  baseUrl: import.meta.env.API_BASE_URL || '',
  apiVersion: 'v1',
  apiUrl: 'api',
  apiEndPoint: {
    auth: 'auth',
    item: {
      root: 'item',
      children: {
        chart: {
          overview: '/chart/overview',
          new: '/chart/addedItem',
          progress: '/chart/progress',
        },
        batch: '/batch',
        autoComplete: '/autoComplete',
      },
    },
    user: 'user',
    category: 'categories',
    type: 'type',
    iotd: 'item-of-the-day',
    config: 'configuration',
    media: {
      root: 'media',
      children: {
        upload: '/upload',
      },
    },
    example: {
      root: 'examples',
      children: {
        random: '/random',
      },
    },
  },
}
