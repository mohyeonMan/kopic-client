import './GameChatPanel.css'
import {
  useEffect,
  useRef,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import type { ChatMessage } from '@/entities/game/model'
import { shouldSkipEnterSubmit } from '@/features/game-board/model/gameBoardShared'

type GameChatPanelProps = {
  containerRef: RefObject<HTMLElement | null>
  visibleChat: ChatMessage[]
  chatListRef: RefObject<HTMLUListElement | null>
  showChatScrollButton: boolean
  guessInput: string
  isComposerFocused: boolean
  isMobileActive: boolean
  onGuessInputChange: (value: string) => void
  onGuessSubmit: () => void
  onChatScroll: (list: HTMLUListElement) => void
  onComposerBlur: () => void
  onComposerFocus: () => void
  onScrollToBottom: () => void
}

export function GameChatPanel({
  containerRef,
  visibleChat,
  chatListRef,
  showChatScrollButton,
  guessInput,
  isComposerFocused,
  isMobileActive,
  onGuessInputChange,
  onGuessSubmit,
  onChatScroll,
  onComposerBlur,
  onComposerFocus,
  onScrollToBottom,
}: GameChatPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const handledTouchFocusRef = useRef(false)
  const asideClassName =
    `panel game-side-panel game-side-panel-right${
      isMobileActive ? ' game-chat-panel-mobile-active' : ' game-chat-panel-mobile-inactive'
    }${isComposerFocused ? ' game-chat-panel-composer-focused' : ''}`

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== 'Enter' ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        document.querySelector('[aria-modal="true"]')
      ) {
        return
      }

      const input = inputRef.current
      if (!input || document.activeElement === input) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      event.preventDefault()
      input.focus({ preventScroll: true })
    }

    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [])

  const handleInputTouchStart = (event: ReactTouchEvent<HTMLInputElement>) => {
    const input = inputRef.current

    if (!input || document.activeElement === input) {
      return
    }

    event.preventDefault()
    handledTouchFocusRef.current = true
    onComposerFocus()
    onScrollToBottom()
    input.focus({ preventScroll: true })
  }

  const handleInputFocus = () => {
    if (handledTouchFocusRef.current) {
      handledTouchFocusRef.current = false
      return
    }

    onComposerFocus()
    onScrollToBottom()
  }

  return (
    <aside ref={containerRef} className={asideClassName} tabIndex={-1}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chat</p>
        </div>
      </div>

      <div className="chat-panel-box">
        <ul
          ref={chatListRef}
          className="chat-list game-chat-list"
          onScroll={(event) => onChatScroll(event.currentTarget)}
        >
          {visibleChat.map((message) => (
            <li
              key={message.id}
              className={
                message.privilegedVisible === true
                  ? `chat-${message.tone} chat-highlighted`
                  : `chat-${message.tone}`
              }
            >
              <strong
                className={
                  message.mine === true
                    ? 'chat-nickname chat-nickname-mine'
                    : 'chat-nickname'
                }
              >
                {message.nickname}
              </strong>
              <span>{message.text}</span>
            </li>
          ))}
        </ul>

        {showChatScrollButton ? (
          <button
            type="button"
            className="chat-scroll-to-bottom-button"
            onClick={onScrollToBottom}
            aria-label="최신 채팅으로 이동"
          />
        ) : null}

        <div className="chat-input-dock">
          <div className="chat-input-dock-shell">
            <div className="chat-input-row">
              <input
                ref={inputRef}
                type="text"
                value={guessInput}
                maxLength={50}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                enterKeyHint="send"
                placeholder="메시지를 입력하세요"
                onTouchStart={handleInputTouchStart}
                onFocus={handleInputFocus}
                onBlur={onComposerBlur}
                onChange={(event) => onGuessInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (shouldSkipEnterSubmit(event)) {
                    return
                  }

                  if (event.key === 'Enter') {
                    onGuessSubmit()
                  }
                }}
              />
              <button
                type="button"
                className="primary-button chat-submit-button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={onGuessSubmit}
                disabled={guessInput.trim().length === 0}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
