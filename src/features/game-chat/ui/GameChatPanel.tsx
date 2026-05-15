/**
 * GameChatPanel
 *
 * 책임:
 * - migrated game chat message list 표시
 * - guess input submit UI 제공
 *
 * 하지 않는 것:
 * - WebSocket/API 직접 호출
 * - raw payload decoding
 * - participant state mutation
 *
 * 의존:
 * - useGameChat orchestration hook
 *
 * 사용 위치:
 * - GamePage
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { useGameChat } from '@/features/game-chat/model/useGameChat'
import './GameChatPanel.css'

type GameChatPanelProps = {
  containerRef?: RefObject<HTMLElement | null>
  isComposerFocused?: boolean
  isMobileActive?: boolean
  onComposerBlur?: () => void
  onComposerFocus?: () => void
  onScrollComposerAnchor?: () => void
}

function shouldSkipEnterSubmit(event: ReactKeyboardEvent<HTMLInputElement>) {
  const nativeEvent = event.nativeEvent as KeyboardEvent & { isComposing?: boolean }
  return nativeEvent.isComposing === true || nativeEvent.keyCode === 229
}

export function GameChatPanel({
  containerRef,
  isComposerFocused = false,
  isMobileActive = true,
  onComposerBlur,
  onComposerFocus,
  onScrollComposerAnchor,
}: GameChatPanelProps) {
  const { input, messages, setInput, submitGuess } = useGameChat()
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const handledTouchFocusRef = useRef(false)
  const stickToBottomRef = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const panelClassName =
    `game-chat-panel${
      isMobileActive ? ' game-chat-panel--mobile-active' : ' game-chat-panel--mobile-inactive'
    }${isComposerFocused ? ' game-chat-panel--composer-focused' : ''}`

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      if (stickToBottomRef.current) {
        list.scrollTop = list.scrollHeight
        setShowScrollButton(false)
        return
      }

      setShowScrollButton(true)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [messages.length])

  const scrollToBottom = () => {
    const list = listRef.current
    if (!list) {
      return
    }

    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }

  const handleListScroll = () => {
    const list = listRef.current
    if (!list) {
      return
    }

    stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40
    setShowScrollButton(!stickToBottomRef.current)
  }

  const handleSubmit = () => {
    submitGuess()
    window.requestAnimationFrame(scrollToBottom)
  }

  const handleInputTouchStart = (event: ReactTouchEvent<HTMLInputElement>) => {
    const inputElement = inputRef.current

    if (!inputElement || document.activeElement === inputElement) {
      return
    }

    event.preventDefault()
    handledTouchFocusRef.current = true
    onComposerFocus?.()
    scrollToBottom()
    onScrollComposerAnchor?.()
    inputElement.focus({ preventScroll: true })
  }

  const handleInputFocus = () => {
    if (handledTouchFocusRef.current) {
      handledTouchFocusRef.current = false
      return
    }

    onComposerFocus?.()
    scrollToBottom()
    onScrollComposerAnchor?.()
  }

  return (
    <section ref={containerRef} className={panelClassName} tabIndex={-1}>
      <header className="game-chat-panel__header">
        <div>
          <p className="game-chat-panel__eyebrow">CHAT</p>
          <h2>정답 채팅</h2>
        </div>
        <span>{messages.length}개</span>
      </header>

      <div ref={listRef} className="game-chat-panel__list" aria-label="채팅 메시지" onScroll={handleListScroll}>
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.privilegedVisible
                ? `game-chat-panel__message game-chat-panel__message--${message.tone} game-chat-panel__message--highlighted`
                : message.mine
                  ? 'game-chat-panel__message game-chat-panel__message--mine'
                  : `game-chat-panel__message game-chat-panel__message--${message.tone}`
            }
          >
            <strong
              className={
                message.mine
                  ? 'game-chat-panel__nickname game-chat-panel__nickname--mine'
                  : 'game-chat-panel__nickname'
              }
            >
              {message.nickname}
            </strong>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      {showScrollButton ? (
        <button
          type="button"
          className="game-chat-panel__scroll-button"
          onClick={scrollToBottom}
          aria-label="최신 채팅으로 이동"
        />
      ) : null}

      <form
        className="game-chat-panel__form"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <input
          ref={inputRef}
          value={input}
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
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (shouldSkipEnterSubmit(event)) {
              return
            }

            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            }
          }}
        />
        <button
          type="submit"
          disabled={input.trim().length === 0}
          onPointerDown={(event) => event.preventDefault()}
        >
          전송
        </button>
      </form>
    </section>
  )
}
