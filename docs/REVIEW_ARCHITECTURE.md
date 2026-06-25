# Review Functionality Architecture

## Overview

The review functionality has been completely separated into two independent systems:

1. **Chrome Extension Review** - For reviewing text on external websites
2. **Web App Review** - For reviewing text within the Enmory web application

## Web App Review Architecture

### Component: ReviewableTextArea

**Location:** `src/app/views/components/reviewableTextArea/ReviewableTextArea.tsx`

A reusable React component that wraps Ant Design's `TextArea` with integrated grammar/spelling review functionality.

#### Features:

- ✅ Review badge button (R) appears when text is present
- ✅ Badge states: R (idle), ... (loading), ✓ (clean), ! (error), or number of suggestions
- ✅ Clicking badge triggers OpenAI review via `reviewSentenceService`
- ✅ Displays suggestion panel with clickable corrections
- ✅ Auto-closes panel when clicking outside
- ✅ Resets review state when text changes
- ✅ Fully self-contained - manages its own state
- ✅ **Unified UI Design** - Uses the same review panel design as TextEditor component

#### Review Panel Design:

Both `ReviewableTextArea` and `TextEditor` now share the same review panel UI:

- Header with summary/title
- Loading state: "Reviewing..."
- Error state: "Review failed. Please try again."
- Empty state: "No suggestions."
- List of suggestions with:
  - Issue type (grammar, spelling, etc.)
  - Current text (highlighted in red)
  - Suggested correction (highlighted in green with arrow →)
  - Explanation of the issue
- Clicking a suggestion applies it and removes it from the list
- Hover effect on suggestion items

#### Props:

```typescript
interface ReviewableTextAreaProps extends Omit<TextAreaProps, 'onChange'> {
  value?: string
  onChange?: (value: string) => void // Simplified onChange - receives string directly
  language?: 'en' | 'vi' // Language for review
  enableReview?: boolean // Toggle review functionality
}
```

#### Usage Example:

```tsx
import { ReviewableTextArea } from '@/views/components'
;<ReviewableTextArea
  value={text}
  onChange={(value) => setText(value)}
  placeholder='Enter text...'
  autoSize={{ minRows: 2 }}
  language='en'
  enableReview={true}
/>
```

### Service: reviewSentenceService

**Location:** `src/app/services/openai/reviewSentence.service.ts`

Handles direct OpenAI API calls from the browser using the build-time injected API key (`import.meta.env.VITE_OPENAI_API_KEY`).

- No localStorage prompts
- No chrome.storage dependencies
- Pure web app service

### Shared Styles

**ReviewableTextArea:** `src/app/views/components/reviewableTextArea/style.scss`
**TextEditor:** `src/app/views/components/textEditor/style.scss`

Both components use the same CSS class structure for the review panel:

- `.review-panel` / `.text-editor__review-panel` - Main container
- `.review-panel__header` - Title/summary bar
- `.review-panel__empty` - Empty/loading/error states
- `.review-panel__list` - Scrollable suggestion list
- `.review-panel__item` - Individual suggestion button
- `.review-panel__issue` - Issue type label
- `.review-panel__current` - Current text (red)
- `.review-panel__next` - Suggested text (green)
- `.review-panel__note` - Explanation text

This ensures a consistent user experience across all review interfaces in the app.

### Files Updated to Use ReviewableTextArea:

1. **ItemForm.tsx** - Origin field review

   - Location: `src/app/views/features/modals/itemModal/ItemForm.tsx`
   - Removed: 150+ lines of custom review logic
   - Added: Single `<ReviewableTextArea>` component

2. **ExampleForm.tsx** - Example origin field review

   - Location: `src/app/views/features/example/ExampleForm.tsx`
   - Using ReviewableTextArea for origin field

3. **ExampleItemForm.tsx** - Multiple example origin fields
   - Location: `src/app/views/features/modals/itemModal/ExampleItemForm.tsx`
   - Using ReviewableTextArea for each example origin field

## Chrome Extension Review Architecture

### Content Script

**Location:** `src/extension/content.js` / `public_ext/content.js`

Injects review UI into external website textareas:

- Wraps around content detection: `if (appType === 'WEB_APP') return` to disable on web app
- Uses `chrome.runtime.sendMessage` to communicate with background service worker
- Manages badge and suggestion panel for external sites only

### Background Service Worker

**Location:** `src/extension/background.js` / `public_ext/background.js`

Handles OpenAI API requests for the extension:

- Loads build-time config: `importScripts('extension-config.js')`
- Falls back to `chrome.storage.sync` for user-provided keys
- Independent from web app review logic

### Build Process

**package.json scripts:**

- `build:ext` - Syncs files and injects OpenAI key into `extension-config.js`
- `sync:ext` - Copies files from `src/extension/` to `public_ext/`

## Key Differences

| Aspect               | Web App Review                 | Extension Review                        |
| -------------------- | ------------------------------ | --------------------------------------- |
| **Component**        | ReviewableTextArea             | Content script injection                |
| **API Key Source**   | `import.meta.env` (build-time) | `extension-config.js` or chrome.storage |
| **Trigger**          | User clicks review badge       | User clicks badge in injected UI        |
| **Context**          | Inside web app forms           | External website textareas              |
| **State Management** | Component internal state       | Content script + background worker      |
| **Disabled When**    | `enableReview={false}`         | `appType === 'WEB_APP'`                 |

## Benefits of Separation

1. **No Code Duplication** - Web app uses single reusable component
2. **Clear Boundaries** - Extension and web app don't interfere with each other
3. **Easier Maintenance** - Changes to web review don't affect extension and vice versa
4. **Type Safety** - TypeScript props make ReviewableTextArea easy to use correctly
5. **Performance** - No unnecessary extension logic running on web app

## Migration Guide

### Before (Custom Review Logic):

```tsx
const [reviewState, setReviewState] = useState('idle')
const [reviewResult, setReviewResult] = useState(null)
const [reviewOpen, setReviewOpen] = useState(false)

const handleReview = async () => {
  // 50+ lines of logic...
}

return (
  <div style={{ position: 'relative' }}>
    <TextArea value={value} onChange={handleChange} />
    <button onClick={handleReview}>...</button>
    {reviewOpen && <div>...</div>}
  </div>
)
```

### After (ReviewableTextArea):

```tsx
return <ReviewableTextArea value={value} onChange={onChange} language='en' enableReview={true} />
```

Reduced from ~150 lines to 6 lines per field! 🎉
