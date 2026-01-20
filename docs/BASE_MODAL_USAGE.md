# Base Modal System

A reusable, context-based modal system that can be called from anywhere in the application.

## Features

- ✅ Call from any component without prop drilling
- ✅ Dynamic content support (any React component)
- ✅ Async operations with loading states
- ✅ Customizable styling and behavior
- ✅ Support for all Ant Design Modal props
- ✅ Automatic cleanup on close
- ✅ Update modal content dynamically

## Setup

The `ModalProvider` is already integrated into your app through `AppContext`. No additional setup required!

## Basic Usage

### 1. Import the hook

```tsx
import { useModal } from '@/context/modal.context'
```

### 2. Use in your component

```tsx
const MyComponent = () => {
  const { showModal, hideModal } = useModal()

  const handleClick = () => {
    showModal({
      title: 'Hello World',
      content: <p>This is a simple modal</p>,
      onConfirm: () => {
        console.log('Confirmed!')
      },
    })
  }

  return <button onClick={handleClick}>Open Modal</button>
}
```

## API Reference

### `showModal(config)`

Opens a modal with the provided configuration.

**Parameters:**

```typescript
interface ModalConfig {
  content: ReactNode // Modal content (required)
  title?: string // Modal title
  width?: number | string // Modal width
  okText?: string // OK button text
  cancelText?: string // Cancel button text
  footer?: ReactNode | null // Custom footer (null to hide)
  onConfirm?: () => void | Promise<void> // OK button callback
  onClose?: () => void // Cancel/close callback
  // ...all other Ant Design Modal props
}
```

**Example:**

```tsx
showModal({
  title: 'Confirm Delete',
  content: <p>Are you sure you want to delete this item?</p>,
  okText: 'Delete',
  cancelText: 'Cancel',
  okButtonProps: { danger: true },
  onConfirm: async () => {
    await deleteItem(id)
    console.log('Item deleted')
  },
})
```

### `hideModal()`

Manually closes the modal.

```tsx
const { hideModal } = useModal()

// Close the modal programmatically
hideModal()
```

### `updateModal(config)`

Updates the modal configuration while it's open.

```tsx
const { showModal, updateModal } = useModal()

// Show initial modal
showModal({
  title: 'Loading...',
  content: <Spinner />,
  footer: null,
})

// Update after data loads
setTimeout(() => {
  updateModal({
    title: 'Data Loaded',
    content: <DataDisplay />,
    okText: 'Close',
  })
}, 2000)
```

## Common Use Cases

### Confirmation Dialog

```tsx
showModal({
  title: 'Confirm Action',
  content: <p>Are you sure?</p>,
  okText: 'Yes',
  cancelText: 'No',
  onConfirm: () => console.log('Confirmed'),
})
```

### Form Modal

```tsx
const [form] = Form.useForm()

showModal({
  title: 'Edit Profile',
  width: 600,
  content: (
    <Form form={form} layout='vertical'>
      <Form.Item name='name' label='Name'>
        <Input />
      </Form.Item>
    </Form>
  ),
  onConfirm: async () => {
    const values = await form.validateFields()
    await updateProfile(values)
  },
})
```

### Custom Content (No Footer)

```tsx
showModal({
  title: 'Custom Content',
  footer: null,
  content: (
    <div>
      <p>Custom content with custom buttons</p>
      <Button onClick={() => hideModal()}>Close</Button>
    </div>
  ),
})
```

### Async Operation with Loading

```tsx
showModal({
  title: 'Delete Item',
  content: <p>This will permanently delete the item.</p>,
  okText: 'Delete',
  okButtonProps: { danger: true },
  onConfirm: async () => {
    // Loading state is handled automatically
    await api.deleteItem(id)
    message.success('Deleted successfully')
  },
})
```

### Warning Modal

```tsx
showModal({
  title: 'Warning',
  content: (
    <div>
      <p style={{ color: 'red' }}>This action cannot be undone!</p>
      <p>Please confirm.</p>
    </div>
  ),
  okText: 'I Understand',
  okButtonProps: { danger: true },
})
```

### Info Display (View Only)

```tsx
showModal({
  title: 'Item Details',
  width: 800,
  footer: null,
  content: <ItemDetails item={item} />,
})
```

## Advanced Features

### Custom Styling

```tsx
showModal({
  title: 'Styled Modal',
  content: <MyContent />,
  width: 1000,
  centered: true,
  maskClosable: false,
  className: 'my-custom-modal',
  bodyStyle: { padding: '30px' },
})
```

### Multiple Modals

To show multiple modals sequentially:

```tsx
const showFirstModal = () => {
  showModal({
    title: 'First Modal',
    content: <p>First modal content</p>,
    onConfirm: () => {
      // First modal will close, then show second
      setTimeout(() => showSecondModal(), 100)
    },
  })
}

const showSecondModal = () => {
  showModal({
    title: 'Second Modal',
    content: <p>Second modal content</p>,
  })
}
```

## Notes

- The modal automatically handles loading states during async `onConfirm` operations
- Modal is destroyed when closed (`destroyOnClose: true`)
- Default close icon is `<CloseSquareOutlined />`
- The modal context is available anywhere within the app (wrapped by `AppContext`)

## Migration from Old Modals

If you have existing modals using Redux state (like `toggleItemModal`, `toggleExModal`), you can now replace them with this base modal:

**Before:**

```tsx
dispatch(settingAction.toggleItemModal())
```

**After:**

```tsx
showModal({
  title: 'Add Item',
  content: <ItemForm />,
})
```
