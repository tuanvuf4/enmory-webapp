import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd'
import {
  CustomerServiceOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  RobotOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { useSelector } from '@/core/hooks'
import { IToeicAttempt, IToeicExam, TOEIC_PARTS_META, ToeicPartNumber } from '@/models/toeic.model'
import { localDb } from '@/services/localDb/db'
import { toeicApi } from '@/services/firebase/api/toeic.api'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  clearToeicProgress,
  getExamAllQuestions,
  loadToeicAttemptsLocal,
  loadToeicExamsLocal,
  loadToeicProgress,
  saveToeicProgress,
  syncToeicWithServer,
} from './toeicData'
import { ToeicExamPractice } from './ToeicExamPractice'
import { ToeicExamResult } from './ToeicExamResult'
import { ToeicAiGeneratorModal } from './ToeicAiGeneratorModal'

const { Title, Text, Paragraph } = Typography

type ToeicViewMode = 'list' | 'practice' | 'result'

export const Toeic = () => {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useSelector((state) => state.auth)
  const uid = user?.uid || firebaseAuthService.getCurrentUser()?.uid || ''
  const isAdmin = user?.configuration?.role === 'admin'

  const [exams, setExams] = useState<IToeicExam[]>([])
  const [attempts, setAttempts] = useState<IToeicAttempt[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<ToeicViewMode>('list')

  const [activeExam, setActiveExam] = useState<IToeicExam | null>(null)
  const [activeAttempt, setActiveAttempt] = useState<IToeicAttempt | null>(null)

  const urlExamId = searchParams.get('id')

  // Practice launch modal state
  const [launchExam, setLaunchExam] = useState<IToeicExam | null>(null)
  const [selectedParts, setSelectedParts] = useState<ToeicPartNumber[]>([1, 2, 3, 4, 5, 6, 7])
  const [practiceDuration, setPracticeDuration] = useState<number>(30)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  const refreshFromLocal = useCallback(async () => {
    const [localExams, localAttempts] = await Promise.all([
      loadToeicExamsLocal(),
      loadToeicAttemptsLocal(uid),
    ])
    setExams(localExams)
    setAttempts(localAttempts)
  }, [uid])

  const handleSync = useCallback(
    async (silent = false) => {
      if (!uid) {
        if (!silent) message.warning('Vui lòng đăng nhập để đồng bộ dữ liệu')
        return
      }
      setIsSyncing(true)
      try {
        await syncToeicWithServer(uid, isAdmin)
        await refreshFromLocal()
        if (!silent) {
          message.success('Đã đồng bộ đề thi và lịch sử làm bài với server')
        }
      } catch (err: any) {
        if (!silent) {
          message.error(err?.message || 'Đồng bộ thất bại, vui lòng thử lại')
        }
      } finally {
        setIsSyncing(false)
      }
    },
    [uid, isAdmin, refreshFromLocal],
  )

  useEffect(() => {
    refreshFromLocal()
    if (uid) {
      handleSync(true)
    }
  }, [uid, refreshFromLocal, handleSync])

  useEffect(() => {
    const onUpdated = () => {
      refreshFromLocal()
    }
    window.addEventListener('enmory:toeic-updated', onUpdated)
    return () => window.removeEventListener('enmory:toeic-updated', onUpdated)
  }, [refreshFromLocal])

  // Sync URL query ?id=xxx with practice mode so reload/direct link opens the exam
  useEffect(() => {
    if (!urlExamId) {
      if (viewMode === 'practice') {
        setViewMode('list')
      }
      return
    }

    if (viewMode === 'result' && activeExam?.id === urlExamId) {
      return
    }

    const resolveUrlExam = async () => {
      let target = exams.find((e) => e.id === urlExamId)
      if (!target) {
        const fromDb = await localDb.toeicExams.get(urlExamId)
        if (fromDb && !fromDb.is_deleted) target = fromDb
      }
      if (target) {
        const saved = loadToeicProgress(target.id, uid)
        if (saved) {
          setSelectedParts(saved.selectedParts)
          setPracticeDuration(saved.durationMinutes)
        } else {
          const available = Array.from(
            new Set(getExamAllQuestions(target).map((q) => q.part)),
          ).sort((a, b) => a - b)
          setSelectedParts(available)
          setPracticeDuration(target.durationMinutes || 120)
        }
        setActiveExam(target)
        setViewMode('practice')
      }
    }

    resolveUrlExam()
  }, [urlExamId, exams, uid, viewMode, activeExam?.id])

  const launchAvailableParts = useMemo(() => {
    if (!launchExam) return [] as ToeicPartNumber[]
    const qs = getExamAllQuestions(launchExam)
    const set = new Set<ToeicPartNumber>(qs.map((q) => q.part))
    return Array.from(set).sort((a, b) => a - b)
  }, [launchExam])

  const handleDeleteExam = async (examId: string) => {
    if (!isAdmin) {
      message.error('Chỉ Admin mới có quyền xóa đề thi')
      return
    }
    try {
      await toeicApi.deleteExam(examId)
      await localDb.toeicExams.delete(examId)
      setExams((prev) => prev.filter((e) => e.id !== examId))
      message.success('Đã xóa đề thi trên server và thiết bị')
    } catch (err: any) {
      message.error(err?.message || 'Không thể xóa đề thi')
    }
  }

  const handleExportExam = (exam: IToeicExam) => {
    const blob = new Blob([JSON.stringify(exam, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exam.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openLaunchModal = (exam: IToeicExam) => {
    const qs = getExamAllQuestions(exam)
    const available = Array.from(new Set(qs.map((q) => q.part))).sort((a, b) => a - b)
    setLaunchExam(exam)
    setSelectedParts(available)
    setPracticeDuration(exam.durationMinutes || 120)
  }

  const handleStartPractice = () => {
    if (!launchExam) return
    if (selectedParts.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 Part để luyện tập')
      return
    }
    clearToeicProgress(launchExam.id, uid)
    saveToeicProgress(
      {
        examId: launchExam.id,
        selectedParts,
        durationMinutes: practiceDuration,
        currentIndex: 0,
        answers: {},
        flaggedIds: [],
        elapsedSeconds: 0,
        remainingSeconds: practiceDuration > 0 ? practiceDuration * 60 : 0,
        updatedAt: Date.now(),
      },
      uid,
    )
    setActiveExam(launchExam)
    setLaunchExam(null)
    setSearchParams({ id: launchExam.id })
    setViewMode('practice')
  }

  const handleResumeExam = (exam: IToeicExam) => {
    setActiveExam(exam)
    setSearchParams({ id: exam.id })
    setViewMode('practice')
  }

  const handleSubmitAttempt = async (attempt: IToeicAttempt) => {
    const attemptWithUid: IToeicAttempt = {
      ...attempt,
      uid: uid || undefined,
    }

    if (uid) {
      try {
        const savedOnServer = await toeicApi.saveAttempt(attemptWithUid)
        await localDb.toeicAttempts.put(savedOnServer)
        setAttempts((prev) => [savedOnServer, ...prev])
        setActiveAttempt(savedOnServer)
        setViewMode('result')
        message.success('Đã nộp bài và lưu kết quả lên server!')
        return
      } catch {
        message.warning('Đã lưu kết quả trên máy (sẽ đồng bộ lên server khi có mạng).')
      }
    } else {
      message.success('Đã nộp bài thi! Xem kết quả chi tiết bên dưới.')
    }

    await localDb.toeicAttempts.put(attemptWithUid)
    setAttempts((prev) => [attemptWithUid, ...prev])
    setActiveAttempt(attemptWithUid)
    setViewMode('result')
  }

  const handleDeleteAttempt = async (attemptId: string) => {
    await localDb.toeicAttempts.delete(attemptId)
    setAttempts((prev) => prev.filter((a) => a.id !== attemptId))
    if (uid) {
      toeicApi.deleteAttempt(attemptId).catch(() => {})
    }
    message.success('Đã xóa lịch sử làm bài')
  }

  const handleViewPastAttempt = (attempt: IToeicAttempt) => {
    const foundExam = exams.find((e) => e.id === attempt.examId)
    if (!foundExam) {
      message.warning('Đề thi gốc của lần làm này đã bị xóa')
      return
    }
    setActiveExam(foundExam)
    setActiveAttempt(attempt)
    setViewMode('result')
  }

  const renderExamList = () => {
    if (exams.length === 0) {
      return (
        <Empty description='Chưa có đề thi nào'>
          {isAdmin && (
            <Button type='primary' icon={<RobotOutlined />} onClick={() => setIsAiModalOpen(true)}>
              Tạo đề bằng AI
            </Button>
          )}
        </Empty>
      )
    }

    return (
      <Row gutter={[16, 16]}>
        {exams.map((exam) => {
          const allQs = getExamAllQuestions(exam)
          const listeningCount = allQs.filter((q) => q.part <= 4).length
          const readingCount = allQs.filter((q) => q.part >= 5).length
          const savedProgress = loadToeicProgress(exam.id, uid)
          const savedAnsweredCount = savedProgress ? Object.keys(savedProgress.answers).length : 0

          const cardActions = [
            ...(savedProgress
              ? [
                  <Button
                    key='resume'
                    type='link'
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleResumeExam(exam)}
                  >
                    Làm tiếp ({savedAnsweredCount})
                  </Button>,
                ]
              : []),
            <Button
              key='practice'
              type='link'
              icon={<PlayCircleOutlined />}
              onClick={() => openLaunchModal(exam)}
            >
              {savedProgress ? 'Làm mới' : 'Luyện đề'}
            </Button>,
          ]

          if (isAdmin) {
            cardActions.push(
              <Popconfirm
                key='delete'
                title='Xóa đề thi này khỏi hệ thống?'
                onConfirm={() => handleDeleteExam(exam.id)}
              >
                <Button type='link' danger icon={<DeleteOutlined />}>
                  Xóa
                </Button>
              </Popconfirm>,
            )
          }

          return (
            <Col xs={24} md={12} xl={8} key={exam.id}>
              <Card
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                actions={cardActions}
              >
                <div className='flex items-start justify-between gap-2 mb-2'>
                  <Title level={5} style={{ margin: 0 }}>
                    {exam.title}
                  </Title>
                  <Button
                    size='small'
                    type='text'
                    icon={<DownloadOutlined />}
                    title='Xuất JSON'
                    onClick={() => handleExportExam(exam)}
                  />
                </div>

                <Space wrap size={6} className='mb-2'>
                  {exam.isSample && <Tag color='purple'>Đề mẫu</Tag>}
                  {savedProgress && (
                    <Tag color='orange'>Đang làm dở ({savedAnsweredCount} câu)</Tag>
                  )}
                  <Tag icon={<CustomerServiceOutlined />} color='blue'>
                    Listening: {listeningCount} câu
                  </Tag>
                  <Tag icon={<ReadOutlined />} color='green'>
                    Reading: {readingCount} câu
                  </Tag>
                  <Tag>{exam.durationMinutes} phút</Tag>
                </Space>

                <Paragraph type='secondary' ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                  {exam.description || 'Đề thi TOEIC Listening & Reading.'}
                </Paragraph>
              </Card>
            </Col>
          )
        })}
      </Row>
    )
  }

  const renderAttemptHistory = () => {
    if (attempts.length === 0) {
      return <Empty description='Bạn chưa hoàn thành bài thi nào' />
    }

    return (
      <Space direction='vertical' size={12} style={{ width: '100%' }}>
        {attempts.map((att) => (
          <Card key={att.id} size='small'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <Text strong style={{ fontSize: 15 }}>
                  {att.examTitle}
                </Text>
                <div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Nộp lúc: {new Date(att.submittedAt).toLocaleString('vi-VN')} • Thời gian:{' '}
                    {Math.floor(att.durationSeconds / 60)}p {att.durationSeconds % 60}s
                  </Text>
                </div>
              </div>

              <Space wrap>
                <Tag color='geekblue' style={{ fontSize: 14, padding: '3px 10px' }}>
                  Tổng: {att.totalScore}/990
                </Tag>
                <Tag color='blue'>
                  L: {att.listeningScore} ({att.listeningCorrect}/{att.listeningTotal})
                </Tag>
                <Tag color='green'>
                  R: {att.readingScore} ({att.readingCorrect}/{att.readingTotal})
                </Tag>
                <Button
                  type='primary'
                  size='small'
                  icon={<EyeOutlined />}
                  onClick={() => handleViewPastAttempt(att)}
                >
                  Xem kết quả
                </Button>
                <Popconfirm
                  title='Xóa lịch sử làm bài này?'
                  onConfirm={() => handleDeleteAttempt(att.id)}
                >
                  <Button size='small' danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        ))}
      </Space>
    )
  }

  return (
    <div className={appStyle.container}>
      <PageTitle content='TOEIC Listening & Reading' />

      {viewMode === 'list' && (
        <Space direction='vertical' size={token.size} style={{ width: '100%' }}>
          <Card>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <Space align='center' className='mb-1'>
                  <Title level={4} style={{ margin: 0 }}>
                    Ngân hàng đề & Luyện thi TOEIC
                  </Title>
                  <Tag color={isAdmin ? 'gold' : 'blue'}>{isAdmin ? 'Admin' : 'Kho đề chung'}</Tag>
                </Space>
                <div>
                  <Text type='secondary'>
                    Kho đề chung cho tất cả người dùng luyện nghe & đọc, lưu kết quả riêng theo từng
                    tài khoản.
                    {!isAdmin && ' (Chỉ Admin mới có quyền tạo hoặc xóa đề thi)'}
                  </Text>
                </div>
              </div>
              <Space wrap>
                <Button
                  icon={<SyncOutlined spin={isSyncing} />}
                  loading={isSyncing}
                  onClick={() => handleSync(false)}
                >
                  Đồng bộ
                </Button>
                {isAdmin && (
                  <Button
                    type='primary'
                    icon={<RobotOutlined />}
                    onClick={() => setIsAiModalOpen(true)}
                  >
                    Tạo đề bằng AI
                  </Button>
                )}
              </Space>
            </div>
          </Card>

          <Card>
            <Tabs
              defaultActiveKey='exams'
              items={[
                {
                  key: 'exams',
                  label: `Danh sách đề thi (${exams.length})`,
                  children: renderExamList(),
                },
                {
                  key: 'history',
                  label: (
                    <Space size={6}>
                      <HistoryOutlined />
                      <span>Lịch sử của bạn ({attempts.length})</span>
                    </Space>
                  ),
                  children: renderAttemptHistory(),
                },
              ]}
            />
          </Card>
        </Space>
      )}

      {viewMode === 'practice' && activeExam && (
        <ToeicExamPractice
          key={activeExam.id}
          exam={activeExam}
          uid={uid}
          selectedParts={selectedParts}
          durationMinutes={practiceDuration}
          onSubmit={handleSubmitAttempt}
          onExit={() => {
            setSearchParams({})
            setViewMode('list')
          }}
        />
      )}

      {viewMode === 'result' && activeExam && activeAttempt && (
        <ToeicExamResult
          exam={activeExam}
          attempt={activeAttempt}
          onRetry={() => {
            clearToeicProgress(activeExam.id, uid)
            setSelectedParts(activeAttempt.selectedParts)
            setPracticeDuration(activeExam.durationMinutes || 120)
            setSearchParams({ id: activeExam.id })
            setViewMode('practice')
          }}
          onBackToList={() => {
            setSearchParams({})
            setViewMode('list')
          }}
        />
      )}

      {/* Practice Configuration Modal */}
      <Modal
        open={Boolean(launchExam)}
        title={`Cấu hình luyện đề: ${launchExam?.title || ''}`}
        onCancel={() => setLaunchExam(null)}
        onOk={handleStartPractice}
        okText='Bắt đầu làm bài'
        cancelText='Hủy'
      >
        <Space direction='vertical' size={14} style={{ width: '100%' }}>
          <div>
            <Text strong>Chọn nhanh chế độ:</Text>
            <div className='flex flex-wrap gap-2 mt-2'>
              <Button size='small' onClick={() => setSelectedParts(launchAvailableParts)}>
                Full Test (Tất cả)
              </Button>
              <Button
                size='small'
                icon={<CustomerServiceOutlined />}
                onClick={() => setSelectedParts(launchAvailableParts.filter((p) => p <= 4))}
              >
                Chỉ Listening (Parts 1–4)
              </Button>
              <Button
                size='small'
                icon={<ReadOutlined />}
                onClick={() => setSelectedParts(launchAvailableParts.filter((p) => p >= 5))}
              >
                Chỉ Reading (Parts 5–7)
              </Button>
            </div>
          </div>

          <div>
            <Text strong>Chọn các Part muốn luyện:</Text>
            <Checkbox.Group
              style={{ width: '100%', marginTop: 8 }}
              value={selectedParts}
              onChange={(vals) => setSelectedParts(vals as ToeicPartNumber[])}
            >
              <Row gutter={[8, 8]}>
                {TOEIC_PARTS_META.map((meta) => {
                  const hasQuestions = launchAvailableParts.includes(meta.part)
                  return (
                    <Col span={12} key={meta.part}>
                      <Checkbox value={meta.part} disabled={!hasQuestions}>
                        Part {meta.part}: {meta.viName}
                      </Checkbox>
                    </Col>
                  )
                })}
              </Row>
            </Checkbox.Group>
          </div>

          <div>
            <Text strong>Thời gian làm bài (phút, nhập 0 nếu không giới hạn):</Text>
            <InputNumber
              style={{ width: '100%', marginTop: 6 }}
              min={0}
              max={180}
              value={practiceDuration}
              onChange={(v) => setPracticeDuration(v ?? 0)}
            />
          </div>
        </Space>
      </Modal>

      {isAdmin && (
        <ToeicAiGeneratorModal
          open={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onGenerated={async (exam) => {
            const examWithUid: IToeicExam = { ...exam, uid }
            try {
              const savedOnServer = await toeicApi.saveExam(examWithUid)
              await localDb.toeicExams.put(savedOnServer)
              setExams((prev) => [savedOnServer, ...prev])
              message.success('Đã lưu đề thi lên server cho mọi người cùng luyện!')
            } catch (err: any) {
              await localDb.toeicExams.put(examWithUid)
              setExams((prev) => [examWithUid, ...prev])
              message.warning(
                err?.message || 'Đã lưu trên máy, vui lòng bấm Đồng bộ để đẩy lên server.',
              )
            }
          }}
        />
      )}
    </div>
  )
}

export default Toeic
