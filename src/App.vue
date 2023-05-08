<script setup lang="ts">
import { NButton, NCard, NConfigProvider, NInputNumber } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { NaiveProvider } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { isTelephoneNumberWhitelist } from '@/utils/functions'
const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const showModal = ref(false)
const number = ref('') as any
function isPhoneNumberValid(phoneNumber: any) {
  const regex = /^(86)?1[3-9]\d{9}$/
  return regex.test(phoneNumber)
}

onMounted(() => {
  const number = localStorage.getItem('TEL')
  showModal.value = !isTelephoneNumberWhitelist(number)
})

const handleConfirmPhone = () => {
  if (!number.value)
    return alert('请输入电话号码')
  if (!isPhoneNumberValid(number.value))
    return alert('请输入正确的电话号码')

  if (!isTelephoneNumberWhitelist(String(number.value)))
    return alert('您无权访问此网页')

  localStorage.setItem('TEL', number.value)
  showModal.value = false
  location.reload()
  number.value = ''
}
</script>

<template>
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <NaiveProvider>
      <RouterView />
    </NaiveProvider>
  </NConfigProvider>

  <div v-if="showModal" class="modal">
    <div style="width: 380px">
      <NCard>
        <div>
          <span style="font-size: 14px;font-weight: bold">请输入您的手机号码</span>
        </div>

        <div style="margin-top: 20px">
          <NInputNumber v-model:value="number" placeholder="请输入您的手机号码" :show-button="false" />
        </div>

        <div style="margin-top: 20px;display: flex;justify-content: flex-end">
          <NButton type="primary" @click.stop="handleConfirmPhone">
            确 认
          </NButton>
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.modal {
    position: fixed;
    z-index: 99999!important;
    background-color: rgb(0,0,0,.4);
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
