import type { Ref } from 'vue'

export function useChatScroll(scrollContainer: Ref<HTMLElement | null>) {
  function getEls() {
    const container = scrollContainer.value!
    const items: HTMLElement[] = Array.from(container.querySelectorAll('.message-item'))
    return { container, items }
  }
  function itemInView(item: HTMLElement, container: HTMLElement) {
    return item.offsetTop <= container.scrollTop + container.clientHeight &&
  item.offsetTop + item.clientHeight > container.scrollTop
  }
  function scroll(action: 'up' | 'down' | 'top' | 'bottom', behavior: 'smooth' | 'auto' = 'smooth') {
    const { container, items } = getEls()
    if (action === 'top') {
      container.scrollTo({ top: 0, behavior })
      return
    } else if (action === 'bottom') {
      container.scrollTo({ top: container.scrollHeight, behavior })
      return
    }

    const index = items.findIndex(item => itemInView(item, container))
    const item = items[index]

    let top: number
    if (action === 'up') {
      if (container.scrollTop - item.offsetTop < 5) {
        if (index === 0) {
          top = 0
        } else {
          top = items[index - 1].offsetTop
        }
      } else {
        top = item.offsetTop
      }
    } else {
      if (index === items.length - 1) {
        top = container.scrollHeight
      } else {
        top = items[index + 1].offsetTop
      }
    }
    container.scrollTo({ top, behavior })
  }

  return {
    scroll,
  }
}
