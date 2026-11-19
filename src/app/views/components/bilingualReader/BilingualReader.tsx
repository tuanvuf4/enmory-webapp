import React, { useMemo, useState } from 'react'
import { Col, Flex, Grid, Row, Segmented, theme } from 'antd'
import clsx from 'clsx'
import { useSelector } from '@/core/hooks'
import { EViewPort } from '@/models/app.model'
import appStyle from '@/style/appStyle.module.scss'
import { alignParagraphPairs, extractParagraphBlocks } from './bilingualUtils'
import styles from './bilingualReader.module.scss'

const { useBreakpoint } = Grid

export type TBilingualViewMode = 'original' | 'bilingual' | 'translation'
export type TBilingualLayout = 'sideBySide' | 'interleaved'

export interface BilingualReaderProps {
  original: string
  translation?: string
  viewMode?: TBilingualViewMode
  onViewModeChange?: (mode: TBilingualViewMode) => void
  initialViewMode?: TBilingualViewMode
  desktopLayout?: TBilingualLayout
  onDesktopLayoutChange?: (layout: TBilingualLayout) => void
  className?: string
  contentClassName?: string
  hideSwitcher?: boolean
}

export const BilingualReader: React.FC<BilingualReaderProps> = ({
  original,
  translation,
  viewMode: controlledViewMode,
  onViewModeChange,
  initialViewMode = 'original',
  desktopLayout: controlledDesktopLayout,
  onDesktopLayoutChange,
  className,
  contentClassName,
  hideSwitcher = false,
}) => {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const { viewPort } = useSelector((state) => state.setting)

  // Internal state when not controlled
  const [internalViewMode, setInternalViewMode] = useState<TBilingualViewMode>(initialViewMode)
  const [internalDesktopLayout, setInternalDesktopLayout] = useState<TBilingualLayout>('sideBySide')

  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = (mode: TBilingualViewMode) => {
    setInternalViewMode(mode)
    onViewModeChange?.(mode)
  }

  const desktopLayout = controlledDesktopLayout ?? internalDesktopLayout
  const setDesktopLayout = (layout: TBilingualLayout) => {
    setInternalDesktopLayout(layout)
    onDesktopLayoutChange?.(layout)
  }

  // Detect mobile: either screens.md is false (width < 768px) or redux viewPort is XS
  const isMobile = screens.md === false || viewPort === EViewPort.XS

  const hasTranslation = Boolean(translation && translation.trim().length > 0)

  // Extract and align paragraphs
  const paragraphPairs = useMemo(() => {
    if (!hasTranslation || !translation) return []
    const origBlocks = extractParagraphBlocks(original)
    const transBlocks = extractParagraphBlocks(translation)
    return alignParagraphPairs(origBlocks, transBlocks)
  }, [original, translation, hasTranslation])

  // Determine effective layout:
  // On mobile, bilingual mode is ALWAYS interleaved by paragraph ("đan xen theo đoạn văn")
  const effectiveLayout: TBilingualLayout = isMobile ? 'interleaved' : desktopLayout

  return (
    <div className={clsx(styles.container, className)}>
      {/* View mode switcher */}
      {!hideSwitcher && hasTranslation && (
        <div className={styles.headerBar}>
          <Segmented
            size='small'
            value={viewMode}
            onChange={(val) => setViewMode(val as TBilingualViewMode)}
            options={[
              { label: 'Bài gốc', value: 'original' },
              { label: 'Song ngữ', value: 'bilingual' },
              { label: 'Bản dịch', value: 'translation' },
            ]}
          />

          {/* Desktop-only layout switcher for bilingual mode (Song song vs Đan xen) */}
          {viewMode === 'bilingual' && !isMobile && paragraphPairs.length > 0 && (
            <Flex align='center' gap={6} className={styles.layoutToggle}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary }}>Hiển thị:</span>
              <Segmented
                size='small'
                value={effectiveLayout}
                onChange={(val) => setDesktopLayout(val as TBilingualLayout)}
                options={[
                  { label: 'Song song', value: 'sideBySide' },
                  { label: 'Đan xen', value: 'interleaved' },
                ]}
              />
            </Flex>
          )}
        </div>
      )}

      {/* Main content view */}
      {viewMode === 'bilingual' && hasTranslation ? (
        effectiveLayout === 'interleaved' ? (
          /* ── Interleaved mode (Đan xen theo đoạn văn) ── */
          <div className={clsx(styles.interleavedContainer, contentClassName)}>
            {paragraphPairs.map((pair, idx) => (
              <div key={idx} className={styles.interleavedPair}>
                {pair.original && (
                  <div
                    className={clsx(appStyle.blog, appStyle.article, styles.originalBlock)}
                    dangerouslySetInnerHTML={{ __html: pair.original }}
                  />
                )}
                {pair.translation && (
                  <div
                    className={styles.translationBlock}
                    style={{
                      background: token.colorFillAlter,
                      borderLeft: `3px solid ${token.colorSuccess}`,
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                      borderRight: `1px solid ${token.colorBorderSecondary}`,
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: '0 8px 8px 0',
                    }}
                  >
                    <div className={styles.translationBadge} style={{ color: token.colorSuccess }}>
                      <span>🇻🇳 Bản dịch</span>
                    </div>
                    <div
                      className={clsx(appStyle.blog, appStyle.article, styles.translationText)}
                      style={{ color: token.colorTextSecondary }}
                      dangerouslySetInnerHTML={{ __html: pair.translation }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Side-by-side mode (Song song 2 cột trên Desktop) ── */
          <div className={clsx(styles.sideBySideContainer, contentClassName)}>
            <Row gutter={[16, 16]} className={styles.sideBySideHeader}>
              <Col span={12}>
                <div className={styles.columnTitleOrig} style={{ color: token.colorPrimary }}>
                  🇺🇸 Bài viết gốc
                </div>
              </Col>
              <Col span={12}>
                <div className={styles.columnTitleTrans} style={{ color: token.colorSuccess }}>
                  🇻🇳 Bản dịch tiếng Việt
                </div>
              </Col>
            </Row>

            {paragraphPairs.map((pair, idx) => (
              <Row
                key={idx}
                gutter={[16, 16]}
                className={styles.sideBySideRow}
                style={{
                  background: token.colorFillAlter,
                }}
              >
                <Col span={12}>
                  <div
                    className={clsx(appStyle.blog, appStyle.article, styles.sideOriginal)}
                    dangerouslySetInnerHTML={{ __html: pair.original }}
                  />
                </Col>
                <Col span={12}>
                  <div
                    className={clsx(appStyle.blog, appStyle.article, styles.sideTranslation)}
                    style={{
                      color: token.colorTextSecondary,
                      background: token.colorBgContainer,
                      padding: '8px 12px',
                      borderRadius: 6,
                      borderLeft: `3px solid ${token.colorSuccess}`,
                    }}
                    dangerouslySetInnerHTML={{ __html: pair.translation }}
                  />
                </Col>
              </Row>
            ))}
          </div>
        )
      ) : viewMode === 'translation' && hasTranslation ? (
        /* ── Full Translation Only ── */
        <div
          className={clsx(appStyle.blog, appStyle.article, contentClassName)}
          dangerouslySetInnerHTML={{ __html: translation || '' }}
        />
      ) : (
        /* ── Full Original Only ── */
        <div
          className={clsx(appStyle.blog, appStyle.article, contentClassName)}
          dangerouslySetInnerHTML={{ __html: original || '' }}
        />
      )}
    </div>
  )
}
