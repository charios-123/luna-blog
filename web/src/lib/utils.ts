import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统一的日期格式化（复用 dayjs，逻辑和 Vue 端一致）
 */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export { dayjs }

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export function fromNow(date: string | Date | undefined | null): string {
  if (!date) return ''
  return dayjs(date).fromNow()
}

/** timeAgo 是 fromNow 的别名，用于评论/留言的相对时间显示 */
export function timeAgo(date: string | Date | undefined | null): string {
  return fromNow(date)
}

/** 去除 HTML 标签，提取纯文本 */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** 从 HTML 内容中提取第一张图片的 src */
export function getFirstImage(html: string): string | null {
  if (!html) return null
  const match = html.match(/<img[^>]*src=["']([^"']+)["']/)
  return match ? match[1] : null
}
