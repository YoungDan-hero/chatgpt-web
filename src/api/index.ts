import type { AxiosProgressEvent, GenericAbortSignal } from 'axios'
import { get } from '@/utils/request'

export function fetchChatAPIProcess<T = any>(
  params: {
    prompt: string
    network?: boolean
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void },
) {
  return get<T>({
    url: 'http://192.168.15.246:8080/streamChatWithWeb',
    data: { content: params.prompt, userId: window.location.hash},
    signal: params.signal,
    onDownloadProgress: params.onDownloadProgress,
  })
}