export function shouldHandlePrimaryEnter(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.key !== 'Enter' ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false
  }

  const target = event.target

  if (!(target instanceof Element)) {
    return true
  }

  if (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return false
  }

  if (target instanceof HTMLInputElement) {
    const inputType = target.type

    return !['button', 'checkbox', 'color', 'file', 'radio', 'range', 'reset', 'submit'].includes(
      inputType,
    )
  }

  return true
}
