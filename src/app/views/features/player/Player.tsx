import { Col, Row, Space, theme } from 'antd'
import { useSelector } from '@/core/hooks'
import { TrackList } from './TrackList'
import { Tags } from '@/views/components'
import appStyle from '@/style/appStyle.module.scss'
import styles from './player.module.scss'
import { LiveTranscript } from './LiveTranscript'
import { TranscriptVocabTabs } from './TranscriptVocabTabs'

export const Player: React.FC = () => {
  const { token } = theme.useToken()

  const { currentTrack, tracks } = useSelector((state) => state.listening)

  return (
    <div style={{ background: token.colorBgContainer }}>
      <Row>
        <Col span={24} md={12} lg={16}>
          <Space direction={'vertical'} size={token.size} className={styles.description}>
            <h3 style={{ color: token.colorPrimary, margin: 0 }}>
              {tracks.findIndex((t) => t.id === currentTrack?.id) !== -1
                ? tracks.find((t) => t.id === currentTrack?.id)?.title
                : 'No track selected'}
            </h3>

            <div
              className={appStyle.article}
              dangerouslySetInnerHTML={{
                __html: currentTrack?.description || 'No description available',
              }}
            />

            {currentTrack?.tags && currentTrack?.tags?.length > 0 && (
              <Tags label={'Tags'} searchBy={'tags'} tags={currentTrack?.tags} />
            )}

            {currentTrack?.relation && currentTrack?.relation?.length > 0 && (
              <Tags label={'Relation'} tags={currentTrack?.relation} />
            )}

            {/* Classification of transcript into words, phrases, collocations by difficulty A1 -> C2 */}
            <TranscriptVocabTabs track={currentTrack} transcript={currentTrack?.transcript || ''} />
          </Space>
        </Col>

        <Col span={24} md={12} lg={8}>
          <Space direction={'vertical'} size={token.size}>
            <TrackList />
            <LiveTranscript />
          </Space>
        </Col>
      </Row>
    </div>
  )
}
