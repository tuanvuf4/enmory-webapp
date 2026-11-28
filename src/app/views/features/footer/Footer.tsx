import { useEffect, useRef } from 'react'
import { Layout } from 'antd'
import { PlayerDock } from '../player/PlayerDock'

export const AppFooter = () => {
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = footerRef.current
    if (!el) return

    const updateHeight = () => {
      const height = Math.round(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--app-footer-height', `${height}px`)
    }

    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)

    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty('--app-footer-height', '0px')
    }
  }, [])

  return (
    <Layout.Footer className='sticky bottom-0 w-full !p-0 italic' style={{ zIndex: 999 }}>
      <div ref={footerRef}>
        <PlayerDock />
      </div>
    </Layout.Footer>
  )
}
