import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
  theme,
} from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  IToeicExam,
  IToeicOption,
  IToeicPassageGroup,
  IToeicQuestion,
  TOEIC_PARTS_META,
  ToeicOptionKey,
  ToeicPartNumber,
} from '@/models/toeic.model'
import { getPartMeta } from './toeicData'
import { ToeicAudioPlayer } from './ToeicAudioPlayer'

const { TextArea } = Input
const { Title, Text } = Typography

interface ToeicExamBuilderProps {
  initialExam?: IToeicExam | null
  onSave: (exam: IToeicExam) => void
  onCancel: () => void
}

const createDefaultOptions = (count: 3 | 4): IToeicOption[] => {
  const keys: ToeicOptionKey[] = count === 3 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']
  return keys.map((key) => ({ key, text: '' }))
}

const createEmptyQuestion = (part: ToeicPartNumber, questionNumber: number): IToeicQuestion => {
  const meta = getPartMeta(part)
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    part,
    questionNumber,
    prompt:
      part === 1
        ? 'Look at the picture and listen to the four statements.'
        : part === 2
          ? 'Listen to the question and choose the best response.'
          : '',
    options: createDefaultOptions(meta.optionsCount),
    correctAnswer: 'A',
    explanation: '',
  }
}

const createEmptyGroup = (part: 3 | 4 | 6 | 7): IToeicPassageGroup => {
  return {
    id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    part,
    title:
      part === 3
        ? 'New Conversation'
        : part === 4
          ? 'New Short Talk'
          : part === 6
            ? 'New Text Completion Passage'
            : 'New Reading Passage',
    passages: part === 6 || part === 7 ? [''] : undefined,
    audioScript: part === 3 || part === 4 ? '' : undefined,
    questions: [
      createEmptyQuestion(part, 1),
      createEmptyQuestion(part, 2),
      createEmptyQuestion(part, 3),
    ],
  }
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Không thể đọc file'))
    reader.readAsDataURL(file)
  })

export const ToeicExamBuilder: React.FC<ToeicExamBuilderProps> = ({
  initialExam,
  onSave,
  onCancel,
}) => {
  const { token } = theme.useToken()
  const [activePart, setActivePart] = useState<ToeicPartNumber>(1)

  const [title, setTitle] = useState(initialExam?.title || 'Đề thi TOEIC Listening & Reading mới')
  const [description, setDescription] = useState(initialExam?.description || '')
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialExam?.durationMinutes || 120,
  )
  const [questions, setQuestions] = useState<IToeicQuestion[]>(initialExam?.questions || [])
  const [passageGroups, setPassageGroups] = useState<IToeicPassageGroup[]>(
    initialExam?.passageGroups || [],
  )

  const partCounts = useMemo(() => {
    const counts: Record<ToeicPartNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
    for (const q of questions) counts[q.part] = (counts[q.part] || 0) + 1
    for (const g of passageGroups) counts[g.part] = (counts[g.part] || 0) + g.questions.length
    return counts
  }, [questions, passageGroups])

  const totalQuestions = Object.values(partCounts).reduce((a, b) => a + b, 0)

  const handleAddSingleQuestion = (part: ToeicPartNumber) => {
    const newQ = createEmptyQuestion(part, questions.length + 1)
    setQuestions((prev) => [...prev, newQ])
  }

  const handleUpdateSingleQuestion = (id: string, patch: Partial<IToeicQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const handleUpdateSingleOption = (qId: string, key: ToeicOptionKey, text: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((opt) => (opt.key === key ? { ...opt, text } : opt)) }
          : q,
      ),
    )
  }

  const handleDeleteSingleQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleAddGroup = (part: 3 | 4 | 6 | 7) => {
    setPassageGroups((prev) => [...prev, createEmptyGroup(part)])
  }

  const handleUpdateGroup = (groupId: string, patch: Partial<IToeicPassageGroup>) => {
    setPassageGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)))
  }

  const handleDeleteGroup = (groupId: string) => {
    setPassageGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  const handleAddGroupQuestion = (groupId: string, part: 3 | 4 | 6 | 7) => {
    setPassageGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, questions: [...g.questions, createEmptyQuestion(part, g.questions.length + 1)] }
          : g,
      ),
    )
  }

  const handleUpdateGroupQuestion = (
    groupId: string,
    qId: string,
    patch: Partial<IToeicQuestion>,
  ) => {
    setPassageGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              questions: g.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
            }
          : g,
      ),
    )
  }

  const handleUpdateGroupOption = (
    groupId: string,
    qId: string,
    key: ToeicOptionKey,
    text: string,
  ) => {
    setPassageGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              questions: g.questions.map((q) =>
                q.id === qId
                  ? {
                      ...q,
                      options: q.options.map((opt) => (opt.key === key ? { ...opt, text } : opt)),
                    }
                  : q,
              ),
            }
          : g,
      ),
    )
  }

  const handleDeleteGroupQuestion = (groupId: string, qId: string) => {
    setPassageGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, questions: g.questions.filter((q) => q.id !== qId) } : g,
      ),
    )
  }

  const handleSaveExam = () => {
    if (!title.trim()) {
      message.warning('Vui lòng nhập tên đề thi')
      return
    }
    if (totalQuestions === 0) {
      message.warning('Đề thi cần ít nhất 1 câu hỏi')
      return
    }

    // Re-number questions sequentially from Part 1 -> Part 7
    let counter = 1
    const numberedSingles: IToeicQuestion[] = []
    const numberedGroups: IToeicPassageGroup[] = []

    const partsOrder: ToeicPartNumber[] = [1, 2, 3, 4, 5, 6, 7]
    for (const p of partsOrder) {
      const meta = getPartMeta(p)
      if (!meta.isGrouped) {
        const pQs = questions.filter((q) => q.part === p)
        for (const q of pQs) {
          numberedSingles.push({ ...q, questionNumber: counter++ })
        }
      } else {
        const pGs = passageGroups.filter((g) => g.part === p)
        for (const g of pGs) {
          const gQs = g.questions.map((q) => ({ ...q, questionNumber: counter++ }))
          numberedGroups.push({ ...g, questions: gQs })
        }
      }
    }

    const now = Date.now()
    const examToSave: IToeicExam = {
      id: initialExam?.id || `toeic_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      durationMinutes: durationMinutes || 120,
      createdAt: initialExam?.createdAt || now,
      updatedAt: now,
      isSample: initialExam?.isSample,
      questions: numberedSingles,
      passageGroups: numberedGroups,
    }

    onSave(examToSave)
  }

  const renderSinglePartEditor = (part: ToeicPartNumber) => {
    const partMeta = getPartMeta(part)
    const partQuestions = questions.filter((q) => q.part === part)

    return (
      <Space direction='vertical' size={16} style={{ width: '100%' }}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <Text strong>
              Part {part}: {partMeta.name} ({partMeta.viName})
            </Text>
            <div>
              <Text type='secondary'>{partMeta.description}</Text>
            </div>
          </div>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => handleAddSingleQuestion(part)}
          >
            Thêm câu hỏi Part {part}
          </Button>
        </div>

        {partQuestions.length === 0 ? (
          <Empty description={`Chưa có câu hỏi nào cho Part ${part}`} />
        ) : (
          partQuestions.map((q, idx) => (
            <Card
              key={q.id}
              size='small'
              title={`Câu ${idx + 1} (Part ${part})`}
              extra={
                <Popconfirm
                  title='Xóa câu hỏi này?'
                  onConfirm={() => handleDeleteSingleQuestion(q.id)}
                >
                  <Button danger size='small' icon={<DeleteOutlined />} />
                </Popconfirm>
              }
            >
              <Space direction='vertical' size={12} style={{ width: '100%' }}>
                <div>
                  <Text strong>Nội dung câu hỏi / Đề bài:</Text>
                  <TextArea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => handleUpdateSingleQuestion(q.id, { prompt: e.target.value })}
                    placeholder={
                      part === 5
                        ? 'Ví dụ: Ms. Chen will _______ the new marketing campaign...'
                        : 'Nhập mô tả hoặc câu hỏi...'
                    }
                  />
                </div>

                {part === 1 && (
                  <div>
                    <Text strong>Hình ảnh (URL hoặc tải ảnh lên):</Text>
                    <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                      <Input
                        value={q.imageUrl || ''}
                        onChange={(e) =>
                          handleUpdateSingleQuestion(q.id, { imageUrl: e.target.value })
                        }
                        placeholder='Dán URL hình ảnh...'
                      />
                      <Upload
                        showUploadList={false}
                        accept='image/*'
                        beforeUpload={async (file) => {
                          const dataUrl = await readFileAsDataUrl(file)
                          handleUpdateSingleQuestion(q.id, { imageUrl: dataUrl })
                          return false
                        }}
                      >
                        <Button icon={<UploadOutlined />}>Tải ảnh</Button>
                      </Upload>
                    </Space.Compact>
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt='Part 1 preview'
                        style={{ maxHeight: 180, marginTop: 8, borderRadius: 8 }}
                      />
                    )}
                  </div>
                )}

                {partMeta.section === 'listening' && (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Text strong>Audio URL hoặc tải file MP3/WAV:</Text>
                      <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                        <Input
                          value={q.audioUrl || ''}
                          onChange={(e) =>
                            handleUpdateSingleQuestion(q.id, { audioUrl: e.target.value })
                          }
                          placeholder='URL file âm thanh (tùy chọn)...'
                        />
                        <Upload
                          showUploadList={false}
                          accept='audio/*'
                          beforeUpload={async (file) => {
                            const dataUrl = await readFileAsDataUrl(file)
                            handleUpdateSingleQuestion(q.id, { audioUrl: dataUrl })
                            return false
                          }}
                        >
                          <Button icon={<UploadOutlined />}>Tải audio</Button>
                        </Upload>
                      </Space.Compact>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Kịch bản đọc tự động (TTS / Transcript):</Text>
                      <TextArea
                        rows={2}
                        style={{ marginTop: 4 }}
                        value={q.audioScript || ''}
                        onChange={(e) =>
                          handleUpdateSingleQuestion(q.id, { audioScript: e.target.value })
                        }
                        placeholder='Nhập lời thoại tiếng Anh để hệ thống tự đọc nếu không có file MP3...'
                      />
                    </Col>
                    <Col span={24}>
                      <ToeicAudioPlayer
                        compact
                        audioUrl={q.audioUrl}
                        audioScript={q.audioScript}
                        title={`Nghe thử câu ${idx + 1}`}
                      />
                    </Col>
                  </Row>
                )}

                <div>
                  <Text strong>Các đáp án & chọn đáp án đúng:</Text>
                  <Radio.Group
                    value={q.correctAnswer}
                    onChange={(e) =>
                      handleUpdateSingleQuestion(q.id, { correctAnswer: e.target.value })
                    }
                    style={{ width: '100%', marginTop: 6 }}
                  >
                    <Row gutter={[10, 10]}>
                      {q.options.map((opt) => (
                        <Col xs={24} md={12} key={opt.key}>
                          <div className='flex items-center gap-2'>
                            <Radio value={opt.key}>{opt.key}</Radio>
                            <Input
                              value={opt.text}
                              onChange={(e) =>
                                handleUpdateSingleOption(q.id, opt.key, e.target.value)
                              }
                              placeholder={`Nội dung đáp án ${opt.key}`}
                            />
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Radio.Group>
                </div>

                <div>
                  <Text strong>Giải thích đáp án (tùy chọn):</Text>
                  <Input
                    value={q.explanation || ''}
                    onChange={(e) =>
                      handleUpdateSingleQuestion(q.id, { explanation: e.target.value })
                    }
                    placeholder='Giải thích ngữ pháp, từ vựng hoặc bẫy nghe...'
                  />
                </div>
              </Space>
            </Card>
          ))
        )}
      </Space>
    )
  }

  const renderGroupedPartEditor = (part: 3 | 4 | 6 | 7) => {
    const partMeta = getPartMeta(part)
    const partGroups = passageGroups.filter((g) => g.part === part)

    return (
      <Space direction='vertical' size={16} style={{ width: '100%' }}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <Text strong>
              Part {part}: {partMeta.name} ({partMeta.viName})
            </Text>
            <div>
              <Text type='secondary'>{partMeta.description}</Text>
            </div>
          </div>
          <Button type='primary' icon={<PlusOutlined />} onClick={() => handleAddGroup(part)}>
            Thêm cụm {part === 3 ? 'hội thoại' : part === 4 ? 'bài nói' : 'đoạn văn'}
          </Button>
        </div>

        {partGroups.length === 0 ? (
          <Empty description={`Chưa có cụm bài nào cho Part ${part}`} />
        ) : (
          partGroups.map((group, gIdx) => (
            <Card
              key={group.id}
              title={`Cụm #${gIdx + 1}: ${group.title || `Part ${part}`}`}
              extra={
                <Popconfirm
                  title='Xóa cả cụm câu hỏi này?'
                  onConfirm={() => handleDeleteGroup(group.id)}
                >
                  <Button danger size='small' icon={<DeleteOutlined />}>
                    Xóa cụm
                  </Button>
                </Popconfirm>
              }
              style={{ borderColor: token.colorPrimaryBorder }}
            >
              <Space direction='vertical' size={14} style={{ width: '100%' }}>
                <Input
                  addonBefore='Tiêu đề cụm'
                  value={group.title || ''}
                  onChange={(e) => handleUpdateGroup(group.id, { title: e.target.value })}
                />

                {partMeta.section === 'listening' ? (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Text strong>Audio URL hoặc tải file MP3/WAV:</Text>
                      <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                        <Input
                          value={group.audioUrl || ''}
                          onChange={(e) =>
                            handleUpdateGroup(group.id, { audioUrl: e.target.value })
                          }
                          placeholder='URL file âm thanh...'
                        />
                        <Upload
                          showUploadList={false}
                          accept='audio/*'
                          beforeUpload={async (file) => {
                            const dataUrl = await readFileAsDataUrl(file)
                            handleUpdateGroup(group.id, { audioUrl: dataUrl })
                            return false
                          }}
                        >
                          <Button icon={<UploadOutlined />}>Tải audio</Button>
                        </Upload>
                      </Space.Compact>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Hình ảnh / Biểu đồ (nếu có):</Text>
                      <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                        <Input
                          value={group.imageUrl || ''}
                          onChange={(e) =>
                            handleUpdateGroup(group.id, { imageUrl: e.target.value })
                          }
                          placeholder='URL hình ảnh/biểu đồ...'
                        />
                        <Upload
                          showUploadList={false}
                          accept='image/*'
                          beforeUpload={async (file) => {
                            const dataUrl = await readFileAsDataUrl(file)
                            handleUpdateGroup(group.id, { imageUrl: dataUrl })
                            return false
                          }}
                        >
                          <Button icon={<UploadOutlined />}>Tải ảnh</Button>
                        </Upload>
                      </Space.Compact>
                    </Col>
                    <Col span={24}>
                      <Text strong>Kịch bản hội thoại / bài nói (TTS & Transcript):</Text>
                      <TextArea
                        rows={4}
                        style={{ marginTop: 4 }}
                        value={group.audioScript || ''}
                        onChange={(e) =>
                          handleUpdateGroup(group.id, { audioScript: e.target.value })
                        }
                        placeholder='Nhập lời thoại tiếng Anh...'
                      />
                    </Col>
                    <Col span={24}>
                      <ToeicAudioPlayer
                        compact
                        audioUrl={group.audioUrl}
                        audioScript={group.audioScript}
                        title={`Nghe thử cụm #${gIdx + 1}`}
                      />
                    </Col>
                  </Row>
                ) : (
                  <Space direction='vertical' size={10} style={{ width: '100%' }}>
                    <div className='flex items-center justify-between'>
                      <Text strong>Nội dung đoạn văn đọc hiểu:</Text>
                      {part === 7 && (
                        <Button
                          size='small'
                          icon={<PlusOutlined />}
                          onClick={() =>
                            handleUpdateGroup(group.id, {
                              passages: [...(group.passages || ['']), ''],
                            })
                          }
                        >
                          Thêm đoạn (Đoạn kép / Đoạn ba)
                        </Button>
                      )}
                    </div>
                    {(group.passages || ['']).map((passage, pIdx) => (
                      <div key={pIdx} className='flex flex-col gap-1'>
                        {(group.passages?.length || 1) > 1 && (
                          <div className='flex items-center justify-between'>
                            <Text type='secondary'>Đoạn {pIdx + 1}</Text>
                            <Button
                              size='small'
                              danger
                              type='text'
                              onClick={() =>
                                handleUpdateGroup(group.id, {
                                  passages: (group.passages || []).filter((_, i) => i !== pIdx),
                                })
                              }
                            >
                              Xóa đoạn này
                            </Button>
                          </div>
                        )}
                        <TextArea
                          rows={5}
                          value={passage}
                          onChange={(e) => {
                            const next = [...(group.passages || [''])]
                            next[pIdx] = e.target.value
                            handleUpdateGroup(group.id, { passages: next })
                          }}
                          placeholder='Nhập nội dung đoạn văn...'
                        />
                      </div>
                    ))}
                  </Space>
                )}

                <div className='flex items-center justify-between pt-2'>
                  <Text strong>Danh sách câu hỏi trong cụm ({group.questions.length})</Text>
                  <Button
                    size='small'
                    icon={<PlusOutlined />}
                    onClick={() => handleAddGroupQuestion(group.id, part)}
                  >
                    Thêm câu hỏi
                  </Button>
                </div>

                {group.questions.map((q, qIdx) => (
                  <Card
                    key={q.id}
                    size='small'
                    type='inner'
                    title={`Câu ${qIdx + 1}`}
                    extra={
                      <Button
                        danger
                        size='small'
                        type='text'
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteGroupQuestion(group.id, q.id)}
                      />
                    }
                  >
                    <Space direction='vertical' size={10} style={{ width: '100%' }}>
                      <Input
                        value={q.prompt}
                        onChange={(e) =>
                          handleUpdateGroupQuestion(group.id, q.id, { prompt: e.target.value })
                        }
                        placeholder='Nhập câu hỏi...'
                      />
                      <Radio.Group
                        value={q.correctAnswer}
                        onChange={(e) =>
                          handleUpdateGroupQuestion(group.id, q.id, {
                            correctAnswer: e.target.value,
                          })
                        }
                        style={{ width: '100%' }}
                      >
                        <Row gutter={[8, 8]}>
                          {q.options.map((opt) => (
                            <Col xs={24} md={12} key={opt.key}>
                              <div className='flex items-center gap-2'>
                                <Radio value={opt.key}>{opt.key}</Radio>
                                <Input
                                  value={opt.text}
                                  onChange={(e) =>
                                    handleUpdateGroupOption(group.id, q.id, opt.key, e.target.value)
                                  }
                                  placeholder={`Đáp án ${opt.key}`}
                                />
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </Radio.Group>
                      <Input
                        value={q.explanation || ''}
                        onChange={(e) =>
                          handleUpdateGroupQuestion(group.id, q.id, {
                            explanation: e.target.value,
                          })
                        }
                        placeholder='Giải thích đáp án (tùy chọn)...'
                      />
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          ))
        )}
      </Space>
    )
  }

  return (
    <Space direction='vertical' size={16} style={{ width: '100%' }}>
      <Card>
        <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
              Quay lại
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {initialExam ? 'Chỉnh sửa đề thi TOEIC' : 'Tạo đề thi TOEIC Listening & Reading'}
            </Title>
          </Space>
          <Space>
            <Tag color='geekblue'>Tổng số câu: {totalQuestions}</Tag>
            <Button type='primary' icon={<SaveOutlined />} onClick={handleSaveExam}>
              Lưu đề thi
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Text strong>Tên đề thi *</Text>
            <Input
              style={{ marginTop: 4 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ví dụ: ETS 2024 Test 1'
            />
          </Col>
          <Col xs={24} md={10}>
            <Text strong>Thời gian làm bài (phút)</Text>
            <InputNumber
              style={{ width: '100%', marginTop: 4 }}
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(v) => setDurationMinutes(v || 120)}
            />
          </Col>
          <Col span={24}>
            <Text strong>Mô tả đề thi</Text>
            <TextArea
              rows={2}
              style={{ marginTop: 4 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ghi chú về nguồn đề, mức độ hoặc nội dung...'
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs
          activeKey={String(activePart)}
          onChange={(k) => setActivePart(Number(k) as ToeicPartNumber)}
          items={TOEIC_PARTS_META.map((meta) => ({
            key: String(meta.part),
            label: (
              <Space size={6}>
                <span>Part {meta.part}</span>
                <Tag color={meta.section === 'listening' ? 'blue' : 'green'} style={{ margin: 0 }}>
                  {partCounts[meta.part]}/{meta.standardCount}
                </Tag>
              </Space>
            ),
            children: meta.isGrouped
              ? renderGroupedPartEditor(meta.part as 3 | 4 | 6 | 7)
              : renderSinglePartEditor(meta.part),
          }))}
        />
      </Card>
    </Space>
  )
}
