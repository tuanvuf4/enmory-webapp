import { useEffect } from 'react'

const useScript = (url: string, async = false) => {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = url
    script.async = async
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [url, async])
}

export default useScript
