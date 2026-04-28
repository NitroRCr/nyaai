<template>
  <q-page-container>
    <q-page
      v-if="workspace"
      p-4
      max-w="1000px"
      mx-a
    >
      <div flex>
        <q-btn-toggle
          v-model="interval"
          :options="[
            { label: t('Monthly'), value: 'monthly' },
            { label: t('Quarterly ({0})', formatOff(maxOffs.quarterly)), value: 'quarterly' },
            { label: t('Yearly ({0})', formatOff(maxOffs.yearly)), value: 'yearly' },
          ]"
          unelevated
          toggle-color="pri-c"
          toggle-text-color="on-pri-c"
          bg-sur-c
          no-caps
        />
        <q-btn-toggle
          v-if="$q.screen.gt.xs"
          v-model="paymentProvider"
          :options="[
            { label: t('Card'), value: 'stripe' },
            { label: t('WeChat Pay'), value: 'wxpay' },
          ]"
          unelevated
          bg-sur-c
          toggle-color="pri-c"
          toggle-text-color="on-pri-c"
          no-caps
          ml-a
        />
      </div>
      <div
        flex="~ col"
        md:flex-row
        gap-4
        mt-4
      >
        <q-card
          v-for="plan in [{
            ...allPlans.find(plan => plan.id === DEFAULT_PLAN_ID)!,
            priceMap: null,
          }, ...plans]"
          :key="plan.id"
          flat
          flex="~ col"
        >
          <q-card-section>
            <div class="text-h6">
              {{ plan.name }}
            </div>
            <div
              v-if="plan.id === workspace.planId"
              text-on-sur-var
            >
              {{ t('Current Plan') }}
            </div>
          </q-card-section>

          <q-card-section
            v-if="plan.priceMap"
            pt-0
          >
            <div>
              <span
                text-lg
                font-500
              >
                {{ formatAmount(plan.priceMap[interval]!) }}
              </span>
              <span> / {{ intervalText }}</span>
            </div>
            <div v-if="interval === 'quarterly'">
              ≈ {{ formatAmount((plan.priceMap[interval]! / 3).toFixed(1)) }} / {{ t('month') }}
              <q-badge
                color="pri-c"
                text-color="on-pri-c"
              >
                {{ formatOff(plan.offs.quarterly) }}
              </q-badge>
            </div>
            <div v-else-if="interval === 'yearly'">
              ≈ {{ formatAmount((plan.priceMap[interval]! / 12).toFixed(1)) }} / {{ t('month') }}
              <q-badge
                color="pri-c"
                text-color="on-pri-c"
              >
                {{ formatOff(plan.offs.yearly) }}
              </q-badge>
            </div>
          </q-card-section>

          <q-card-section
            v-if="plan.priceMap"
            pt-0
          >
            <q-btn
              v-if="workspace.planId === DEFAULT_PLAN_ID"
              unelevated
              bg-pri
              text-on-pri
              :label="t('Upgrade')"
              @click="checkout(plan.id)"
              :loading
              no-caps
            />
            <template v-else-if="workspace.payment?.type === 'wxpay' && paymentProvider === 'wxpay'">
              <q-btn
                v-if="plan.id === workspace.planId"
                unelevated
                bg-pri
                text-on-pri
                :label="t('Renew Subscription')"
                @click="checkout(plan.id)"
                :loading
                no-caps
              />
              <q-btn
                v-else-if="upgradable(plan.id)"
                unelevated
                bg-pri
                text-on-pri
                :label="t('Upgrade')"
                @click="upgrade(plan.id)"
                :loading
                no-caps
              />
            </template>
            <q-btn
              v-else-if="workspace.payment?.type === 'stripe' && paymentProvider === 'stripe'"
              unelevated
              bg-pri
              text-on-pri
              :label="t('Manage Subscription')"
              @click="gotoPortal"
              :loading
              no-caps
            />
          </q-card-section>
          <q-card-section
            pt-0
            mt-a
          >
            <div
              flex="~ col"
              gap-2
            >
              <div decoration="underline out offset-2">
                <q-icon
                  name="sym_o_check"
                  text-suc
                  mr-2
                />
                {{ t('All features') }}
                <q-tooltip>
                  {{ t('All plans includes all the features!') }}<br>
                  {{ t('The higher-tier plans simply offer significantly higher usage limits.') }}
                </q-tooltip>
              </div>
              <div>
                <q-icon
                  name="sym_o_check"
                  text-suc
                  mr-2
                />
                <router-link
                  to="/models"
                  text-on-sur
                  decoration="underline out offset-2"
                >
                  {{ t('${0} AI quota', plan.quotaLimit) }}
                </router-link>
                {{ t('per month') }}
              </div>
              <div>
                <q-icon
                  name="sym_o_check"
                  text-suc
                  mr-2
                />
                {{ t('{0} file storage space', formatBytes(plan.storageLimit)) }}
              </div>
              <div>
                <q-icon
                  name="sym_o_check"
                  text-suc
                  mr-2
                />
                {{ t('{0} max file size', formatBytes(plan.fileSizeLimit)) }}
              </div>
              <div>
                <q-icon
                  name="sym_o_check"
                  text-suc
                  mr-2
                />
                {{ t('Up to {0} members', plan.maxMembers) }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { queries } from 'app/src-shared/queries'
import { DEFAULT_PLAN_ID } from 'app/src-shared/utils/config'
import { currencyPrefix } from 'app/src-shared/utils/functions'
import type { PlanInterval } from 'app/src-shared/utils/validators'
import { useQuasar } from 'quasar'
import { useQuery } from 'src/composables/zero/query'
import { useWorkspaceStore } from 'src/stores/workspace'
import { formatBytes } from 'src/utils/functions'
import { client } from 'src/utils/hc'
import { locale, t } from 'src/utils/i18n'
import { computed, ref, toRef } from 'vue'

const workspaceStore = useWorkspaceStore()
const workspace = toRef(workspaceStore, 'workspace')

const paymentProvider = ref(workspace.value?.payment?.type ?? (locale === 'zh-CN' ? 'wxpay' : 'stripe'))
const interval = ref<PlanInterval>('monthly')
const intervalText = computed(() => {
  return interval.value === 'monthly' ? t('month') : interval.value === 'quarterly' ? t('3 months') : t('year')
})
const { data: allPlans } = useQuery(() => queries.plans())

const plans = computed(() =>
  allPlans.value
    .map(plan => ({
      ...plan,
      priceMap: plan.prices.reduce((acc, price) => {
        if (price.provider === paymentProvider.value) acc[price.interval] = price.amount
        return acc
      }, {} as Record<PlanInterval, number | undefined>),
    }))
    .map(plan => {
      const { monthly, quarterly, yearly } = plan.priceMap
      return {
        ...plan,
        offs: {
          quarterly: monthly && quarterly ? getOff(quarterly / 3, monthly) : 0,
          yearly: monthly && yearly ? getOff(yearly / 12, monthly) : 0,
        },
      }
    })
    .filter(plan => plan.priceMap[interval.value])
    .sort((a, b) => a.priceMap[interval.value]! - b.priceMap[interval.value]!),
)
const maxOffs = computed(() => ({
  quarterly: Math.max(0, ...plans.value.map(plan => plan.offs.quarterly)),
  yearly: Math.max(0, ...plans.value.map(plan => plan.offs.yearly)),
}))
function getOff(amount: number, base: number) {
  return (1 - amount / base) * 100
}
function formatOff(off: number) {
  return `-${off.toFixed(0)}%`
}
function formatAmount(amount) {
  const prefix = currencyPrefix(paymentProvider.value)
  return `${prefix}${amount}`
}
const loading = ref(false)
const $q = useQuasar()
function gotoPortal() {
  loading.value = true
  client.api.payment.createPortalSession.$post({
    json: { workspaceId: workspaceStore.id! },
  }).then(async res => {
    const data = await res.json()
    if ('error' in data) throw new Error(data.error)
    window.open(data.url, '_blank')
  }).catch(err => {
    $q.notify({
      message: t('Failed to create portal session: {0}', err.message),
      color: 'negative',
    })
  }).finally(() => {
    loading.value = false
  })
}
function checkout(planId: string) {
  loading.value = true
  client.api.payment.checkout.$post({
    json: {
      provider: paymentProvider.value,
      workspaceId: workspaceStore.id!,
      planId,
      interval: interval.value,
    },
  }).then(async res => {
    const data = await res.json()
    if ('error' in data) throw new Error(data.error)
    window.open(data.url, '_blank')
  }).catch(err => {
    $q.notify({
      message: t('Failed to checkout: {0}', err.message),
      color: 'negative',
    })
  }).finally(() => {
    loading.value = false
  })
}
function upgradable(planId: string) {
  const planFromId = workspace.value?.planId
  if (planFromId === DEFAULT_PLAN_ID) return true
  const priceFrom = plans.value.find(plan => plan.id === planFromId)?.priceMap[interval.value]
  const priceTo = plans.value.find(plan => plan.id === planId)?.priceMap[interval.value]
  if (!priceFrom || !priceTo) return false
  return priceTo > priceFrom
}
function upgrade(planId: string) {
  const remainingMonths = workspace.value?.remainingMonths
  if (!remainingMonths) return
  if (remainingMonths >= 3 && interval.value !== 'yearly') {
    interval.value = 'yearly'
    return
  }
  if (remainingMonths >= 1 && interval.value === 'monthly') {
    interval.value = 'quarterly'
    return
  }
  checkout(planId)
}
</script>
