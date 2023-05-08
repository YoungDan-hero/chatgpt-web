<script setup lang='ts'>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NAutoComplete, NButton, NInput, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { storeToRefs } from 'pinia'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useCopyCode } from './hooks/useCopyCode'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, usePromptStore } from '@/store'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'
import { isTelephoneNumberWhitelist } from '@/utils/functions'
let controller = new AbortController()

// const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()

useCopyCode()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const getEnabledNetwork = computed(() => chatStore.getEnabledNetwork)
// const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !item.error)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)

// 添加PromptStore
const promptStore = usePromptStore()
// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)
const isCanView = () => {
  const number = localStorage.getItem('TEL')
  if (!isTelephoneNumberWhitelist(number)) {
    ms.error('您无权访问此网页')
    location.reload()
    return false
  }

  return true
}
function handleSubmit() {
  if (isCanView())
    onConversation()
}

async function onConversation() {
  const message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  const options: Chat.ConversationRequest = { conversationId: usingContext.value ? window.location.hash : Math.random().toString() }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    await fetchChatAPIProcess<Chat.ConversationResponse>({
      prompt: message,
      signal: controller.signal,
      onDownloadProgress: ({ event }) => {
        const xhr = event.target
        const { responseText } = xhr
        try {
          updateChat(
            +uuid,
            dataSources.value.length - 1,
            {
              dateTime: new Date().toLocaleString(),
              text: responseText ?? '',
              inversion: false,
              error: false,
              loading: false,
              conversationOptions: { },
              requestOptions: { prompt: message, options: { ...options } },
            },
          )
          scrollToBottom()
        }
        catch (error) {
          //
        }
      },
    })
  }
  catch (error: any) {
    const errorMessage = error?.text ?? t('common.wrong')

    if (error.text === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (isCanView()) {
    if (loading.value)
      return

    controller = new AbortController()

    const { requestOptions } = dataSources.value[index]

    const message = requestOptions?.prompt ?? ''

    let options: Chat.ConversationRequest = {}

    if (requestOptions.options)
      options = { ...requestOptions.options }

    loading.value = true

    updateChat(
      +uuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: '',
        inversion: false,
        error: false,
        loading: true,
        conversationOptions: null,
        requestOptions: { prompt: message, ...options },
      },
    )

    try {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          try {
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: responseText ?? '',
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: { },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )
            scrollToBottom()
          }
          catch (error) {
            //
          }
        },
      })
    }
    catch (error: any) {
      if (error.text === 'canceled') {
        updateChatSome(
          +uuid,
          index,
          {
            loading: false,
          },
        )
        return
      }

      const errorMessage = error?.text ?? t('common.wrong')

      updateChat(
        +uuid,
        index,
        {
          dateTime: new Date().toLocaleString(),
          text: errorMessage,
          inversion: false,
          error: true,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, ...options },
        },
      )
    }
    finally {
      loading.value = false
    }
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        console.error('error', error)
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  chatStore.toggleNetwork()
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})
// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})

const handleClick = (e: any) => {
  prompt.value = e.target.innerText
}
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @toggle-using-context="toggleUsingContext"
    />
    <main class="flex-1 overflow-hidden">
      <div
        id="scrollRef"
        ref="scrollRef"
        class="h-full overflow-hidden overflow-y-auto"
      >
        <div
          id="image-wrapper"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <template v-if="!dataSources.length">
            <div class="yd-top">
              ChatGpt
            </div>

            <div v-if="!isMobile" class="yd-spe">
              <div>
                <h2 class="m-auto flex items-center gap-3 text-lg font-normal md:flex-col md:gap-2">
                  <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>Examples
                </h2>

                <div class="notice-item">
                  <div @click="handleClick">
                    "解释一下什么是量子计算"
                  </div>

                  <div @click="handleClick">
                    "用JS实现冒泡排序"
                  </div>

                  <div @click="handleClick">
                    "帮我设计一份生日派对计划书"
                  </div>
                </div>
              </div>

              <div>
                <h2 class="m-auto flex items-center gap-3 text-lg font-normal md:flex-col md:gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>Capabilities
                </h2>

                <div class="notice-item">
                  <div>
                    可以为用户提供连续对话
                  </div>

                  <div>
                    允许用户提供后续更正
                  </div>

                  <div>
                    主动拒绝不适宜对话
                  </div>
                </div>
              </div>

              <div>
                <h2 class="m-auto flex items-center gap-3 text-lg font-normal md:flex-col md:gap-2">
                  <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>Limitations
                </h2>

                <div class="notice-item">
                  <div>
                    可能偶尔会产生不正确的信息
                  </div>

                  <div>
                    可能偶尔会产生有偏见的内容
                  </div>

                  <div>
                    可能对最新的互联网内容不熟悉
                  </div>
                </div>
              </div>
            </div>

            <div v-else style="display: flex;align-items: center;justify-content: center;margin-top: 50px;font-weight: bold">
              在下面输入框输入你想询问的问题
            </div>
          </template>
          <template v-else>
            <Message
              v-for="(item, index) of dataSources"
              :key="index"
              :date-time="item.dateTime"
              :text="item.text"
              :inversion="item.inversion"
              :error="item.error"
              :loading="item.loading"
              @regenerate="onRegenerate(index)"
              @delete="handleDelete(index)"
            />
            <div class="sticky bottom-0 left-0 flex justify-center">
              <NButton v-if="loading" type="warning" @click="handleStop">
                <template #icon>
                  <SvgIcon icon="ri:stop-circle-line" />
                </template>
                Stop Responding
              </NButton>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="flex items-center justify-between space-x-2">
        <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
          <template #default="{ handleInput, handleBlur, handleFocus }">
            <NInput
              v-model:value="prompt" type="textarea" :placeholder="placeholder"
              :autosize="{ minRows: 1, maxRows: 2 }" @input="handleInput" @focus="handleFocus" @blur="handleBlur" @keypress="handleEnter"
            />
          </template>
        </NAutoComplete>
        <HoverButton v-if="!isMobile" @click="handleExport">
          <span class="text-xl text-[#4f555e] dark:text-white">
            <SvgIcon icon="ri:download-2-line" />
          </span>
        </HoverButton>
        <HoverButton v-if="!isMobile" @click="toggleUsingContext">
          <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
            <SvgIcon icon="ri:chat-history-line" />
          </span>
        </HoverButton>
        <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
          <template #icon>
            <span class="dark:text-black">
              <SvgIcon icon="ri:send-plane-fill" />
            </span>
          </template>
        </NButton>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.yd-top {
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: bold;
}

.yd-spe {
    margin-top: 100px;
    display: flex;

    justify-content: space-around;
}

.notice-item div {
    cursor: pointer;
    margin-top: 20px;
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(247,247,248);
    font-weight: bold;
}

.earth div{
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: rgb(247,247,248);
    font-size: 16px;

}

.enabledNetwork {
    box-shadow: 0 0 20px 6px #00FF00;
}

.abledNetwork {
    box-shadow: 0 0 20px 6px red;
}
</style>
