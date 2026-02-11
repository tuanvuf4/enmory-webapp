import { useState } from 'react'
import { AutoComplete, Space, Tag } from 'antd'
import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons'
import styles from './style.module.scss'
import clsx from 'clsx'
import { useAutoComplete } from '@/helpers/hooks/autoComplete'
import { getArrayUniqueItem } from '@/helpers/item'
import { isGroupWord } from '@/helpers/validate'

interface IPros {
  onChange: (args: string[]) => void
  tags: string[]
  allowSpace?: boolean
}

export const InputTag: React.FC<IPros> = ({ tags, allowSpace = true, onChange }) => {
  const [inputVisible, setInputVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [editInputIndex, setEditInputIndex] = useState(-1)
  const [editInputValue, setEditInputValue] = useState('')
  const [currentSearch, setCurrentSearch] = useState<string>('')

  const { options } = useAutoComplete({ keyword: currentSearch })

  const onSearch = (searchText: string) => {
    setCurrentSearch(searchText)
  }

  const handleClose = (removedTag: string) => {
    onChange([...tags.filter((tag) => tag !== removedTag)])
  }

  const onSelect = (tag: string) => {
    if (inputVisible) {
      allowSpace
        ? onChange(getArrayUniqueItem([...tags, tag]))
        : isGroupWord(tag)
          ? onChange([...tags])
          : onChange(getArrayUniqueItem([...tags, tag]))
      setInputVisible(false)
      setInputValue('')
    } else {
      if (allowSpace) {
        const newTags = [...tags]
        newTags[editInputIndex] = tag.trim()
        onChange(getArrayUniqueItem([...newTags]))
      } else {
        if (isGroupWord(tag)) {
          onChange([...tags])
        } else {
          const newTags = [...tags]
          newTags[editInputIndex] = tag.trim()
          onChange(getArrayUniqueItem([...newTags]))
        }
      }
      setEditInputIndex(-1)
      setInputValue('')
    }
  }

  const onInputChange = (data: string) => {
    inputVisible ? setInputValue(data) : setEditInputValue(data)
  }

  const onBlur = () => {
    setCurrentSearch('')
    if (inputVisible) {
      if (inputValue && tags.indexOf(inputValue) === -1) {
        allowSpace
          ? onChange([...tags, inputValue])
          : isGroupWord(inputValue)
            ? onChange([...tags])
            : onChange([...tags, inputValue])
      }
      setInputVisible(false)
      setInputValue('')
    } else {
      if (allowSpace) {
        const newTags = [...tags]
        newTags[editInputIndex] = editInputValue
        editInputValue ? newTags[editInputIndex] : newTags.splice(editInputIndex, 1)
        onChange([...newTags])
      } else {
        if (isGroupWord(editInputValue)) {
          onChange([...tags])
        } else {
          const newTags = [...tags]
          newTags[editInputIndex] = editInputValue
          editInputValue ? newTags[editInputIndex] : newTags.splice(editInputIndex, 1)
          onChange(getArrayUniqueItem([...newTags]))
        }
      }

      setEditInputIndex(-1)
      setEditInputValue('')
    }
  }

  return (
    <Space size={[0, 8]} wrap>
      {tags && tags.length > 0 && (
        <Space size={[0, 8]} wrap direction={'horizontal'}>
          {tags.map((tag, index) => {
            if (editInputIndex === index) {
              return (
                <AutoComplete
                  autoFocus={true}
                  key={tag + index}
                  value={editInputValue}
                  className={clsx([styles.tag, styles.inputAutoComplete])}
                  allowClear={{ clearIcon: <CloseCircleOutlined style={{ fontSize: 14 }} /> }}
                  options={options}
                  onSearch={onSearch}
                  onSelect={onSelect}
                  onChange={onInputChange}
                  onBlur={onBlur}
                  placeholder={editInputValue}
                />
              )
            }

            return (
              <Tag
                key={tag + index}
                closable={true}
                className={clsx([styles.tag])}
                onClose={() => handleClose(tag)}
              >
                <span
                  onDoubleClick={(e) => {
                    setEditInputIndex(index)
                    setEditInputValue(tag)
                    e.preventDefault()
                  }}
                >
                  {tag}
                </span>
              </Tag>
            )
          })}
        </Space>
      )}

      {inputVisible ? (
        <AutoComplete
          value={inputValue}
          autoFocus={true}
          className={clsx([styles.tag, styles.inputAutoComplete])}
          options={options}
          onSearch={onSearch}
          onSelect={onSelect}
          onChange={onInputChange}
          onBlur={onBlur}
          placeholder='New word'
          allowClear={{ clearIcon: <CloseCircleOutlined style={{ fontSize: 14 }} /> }}
        />
      ) : (
        <Tag className={clsx([styles.tag, styles.tagPlus])} onClick={() => setInputVisible(true)}>
          Add <PlusOutlined />
        </Tag>
      )}
    </Space>
  )
}
