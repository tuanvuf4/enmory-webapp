// Minimal ambient typings for the Chrome Extension APIs we touch.
// We only declare what we use; full @types/chrome is heavy and unnecessary.
declare namespace chrome {
  namespace runtime {
    const id: string | undefined
    const lastError: { message?: string } | undefined
  }

  namespace storage {
    interface StorageArea {
      set: (items: Record<string, unknown>) => Promise<void>
      get: (keys: string[] | string | null) => Promise<Record<string, unknown>>
      clear: () => Promise<void>
      remove: (keys: string | string[]) => Promise<void>
    }
    const sync: StorageArea
    const local: StorageArea
  }

  namespace identity {
    interface TokenDetails {
      interactive?: boolean
      account?: { id: string }
      scopes?: string[]
    }
    interface InvalidTokenDetails {
      token: string
    }
    interface WebAuthFlowDetails {
      url: string
      interactive?: boolean
      abortOnLoadForNonInteractive?: boolean
      timeoutMsForNonInteractive?: number
    }
    // MV3 returns a Promise; older signature with callback also exists.
    function getAuthToken(details?: TokenDetails): Promise<string>
    function removeCachedAuthToken(details: InvalidTokenDetails): Promise<void>
    function clearAllCachedAuthTokens(): Promise<void>
    function launchWebAuthFlow(details: WebAuthFlowDetails): Promise<string | undefined>
    function getRedirectURL(path?: string): string
  }
}
