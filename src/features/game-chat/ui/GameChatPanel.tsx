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
import { useEffect, useRef } from 'react'
import { useGameChat } from '@/features/game-chat/model/useGameChat'
import './GameChatPanel.css'

export function GameChatPanel() {
  const { canSubmitGuess, input, messages, setInput, submitGuess } = useGameChat()
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length])

  return (
    <section className="game-chat-panel">
      <header className="game-chat-panel__header">
        <div>
          <p className="game-chat-panel__eyebrow">CHAT</p>
          <h2>정답 채팅</h2>
        </div>
        <span>{messages.length}개</span>
      </header>

      <div ref={listRef} className="game-chat-panel__list" aria-label="채팅 메시지">
        {messages.length > 0 ? (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                message.mine
                  ? 'game-chat-panel__message game-chat-panel__message--mine'
                  : `game-chat-panel__message game-chat-panel__message--${message.tone}`
              }
            >
              <strong>{message.nickname}</strong>
              <p>{message.text}</p>
            </article>
          ))
        ) : (
          <p className="game-chat-panel__empty">아직 메시지가 없습니다.</p>
        )}
      </div>

      <form
        className="game-chat-panel__form"
        onSubmit={(event) => {
          event.preventDefault()
          submitGuess()
        }}
      >
        <input
          value={input}
          disabled={!canSubmitGuess}
          placeholder={canSubmitGuess ? '정답을 입력하세요' : '그리기 턴에 정답 입력 가능'}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" disabled={!canSubmitGuess || input.trim().length === 0}>
          전송
        </button>
      </form>
    </section>
  )
}
