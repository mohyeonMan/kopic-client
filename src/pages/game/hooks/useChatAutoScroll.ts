import { useLayoutEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../../entities/game/model'

export function useChatAutoScroll(visibleChat: ChatMessage[]) {
  const [showChatScrollButton, setShowChatScrollButton] = useState(false)
  const chatListRef = useRef<HTMLUListElement | null>(null)
  const chatStickToBottomRef = useRef(true)

  useLayoutEffect(() => {
    const list = chatListRef.current

    if (!list) {
      return
    }

    if (chatStickToBottomRef.current) {
      list.scrollTop = list.scrollHeight
      setShowChatScrollButton(false)
      return
    }

    setShowChatScrollButton(true)
  }, [visibleChat])

  const scrollChatToBottom = () => {
    const list = chatListRef.current

    if (!list) {
      return
    }

    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }

  const handleChatScroll = (list: HTMLUListElement) => {
    chatStickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40
    setShowChatScrollButton(!chatStickToBottomRef.current)
  }

  return {
    chatListRef,
    handleChatScroll,
    scrollChatToBottom,
    showChatScrollButton,
  }
}
