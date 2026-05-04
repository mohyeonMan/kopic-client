import './GameChatPanel.css'
import type { RefObject } from 'react'
import type { ChatMessage } from '../../../entities/game/model'
import { shouldSkipEnterSubmit } from '../gamePageShared'

type GameChatPanelProps = {
  visibleChat: ChatMessage[]
  chatListRef: RefObject<HTMLUListElement | null>
  showChatScrollButton: boolean
  guessInput: string
  isComposerFocused: boolean
  isMobileActive: boolean
  onGuessClear: () => void
  onGuessInputChange: (value: string) => void
  onGuessSubmit: () => void
  onChatScroll: (list: HTMLUListElement) => void
  onComposerBlur: () => void
  onComposerFocus: () => void
  onScrollToBottom: () => void
}

export function GameChatPanel({
  visibleChat,
  chatListRef,
  showChatScrollButton,
  guessInput,
  isComposerFocused,
  isMobileActive,
  onGuessClear,
  onGuessInputChange,
  onGuessSubmit,
  onChatScroll,
  onComposerBlur,
  onComposerFocus,
  onScrollToBottom,
}: GameChatPanelProps) {
  const asideClassName =
    `panel game-side-panel game-side-panel-right${
      isMobileActive ? ' game-chat-panel-mobile-active' : ' game-side-panel-mobile-hidden'
    }${isComposerFocused ? ' game-chat-panel-composer-focused' : ''}`

  return (
    <aside className={asideClassName}>
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
                value={guessInput}
                maxLength={50}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="send"
                placeholder="메시지를 입력하세요"
                onFocus={() => {
                  onComposerFocus()
                  onScrollToBottom()
                }}
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
                className="secondary-button chat-clear-button"
                onClick={onGuessClear}
                disabled={guessInput.length === 0}
              >
                지우기
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
