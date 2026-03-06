import type { CronJob } from '../types/cron'
import { broadcast } from './broadcast'
import { sendToAgent } from './gateway'

const state = {
  jobs: new Map<string, CronJob>(),
  timers: new Map<string, any>(),
}

function parseCron(schedule: string): { minute: number[]; hour: number[]; dayOfMonth: number[]; month: number[]; dayOfWeek: number[] } {
  const parts = schedule.split(' ')
  return {
    minute: parseCronField(parts[0], 0, 59),
    hour: parseCronField(parts[1], 0, 23),
    dayOfMonth: parseCronField(parts[2], 1, 31),
    month: parseCronField(parts[3], 1, 12),
    dayOfWeek: parseCronField(parts[4], 0, 6),
  }
}

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }
  if (field.includes(',')) {
    return field.split(',').flatMap((v) => parseCronField(v, min, max))
  }
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  if (field.includes('/')) {
    const [, step] = field.split('/')
    return Array.from({ length: Math.floor((max - min) / Number(step)) + 1 }, (_, i) => min + i * Number(step))
  }
  return [Number(field)]
}

function getNextRun(schedule: string): number {
  const cron = parseCron(schedule)
  const now = new Date()

  for (let i = 0; i < 24 * 60; i++) {
    const check = new Date(now.getTime() + i * 60000)
    const minute = check.getMinutes()
    const hour = check.getHours()
    const dayOfMonth = check.getDate()
    const month = check.getMonth() + 1
    const dayOfWeek = check.getDay()

    if (cron.minute.includes(minute) && cron.hour.includes(hour) &&
        cron.dayOfMonth.includes(dayOfMonth) && cron.month.includes(month) &&
        cron.dayOfWeek.includes(dayOfWeek)) {
      return check.getTime()
    }
  }
  return now.getTime() + 24 * 60 * 60 * 1000
}

export function addCronJob(job: Omit<CronJob, 'id' | 'nextRun'>) {
  const id = crypto.randomUUID()
  const cronJob: CronJob = {
    ...job,
    id,
    nextRun: getNextRun(job.schedule),
  }
  state.jobs.set(id, cronJob)
  scheduleJob(cronJob)
  broadcast({ type: 'cron:update', job: cronJob })
  return cronJob
}

function scheduleJob(job: CronJob) {
  if (!job.enabled) return

  const delay = job.nextRun - Date.now()
  if (delay <= 0) {
    runJob(job.id)
    return
  }

  const timer = setTimeout(() => runJob(job.id), delay)
  state.timers.set(job.id, timer)
}

function runJob(jobId: CronJob['id']) {
  const job = state.jobs.get(jobId)
  if (!job) return

  // Mark as running
  job.lastRun = { timestamp: Date.now(), status: 'running', duration: 0 }
  broadcast({ type: 'cron:update', job })

  // Execute the command
  const startTime = Date.now()
  sendToAgent(job.agentId, job.command)

  // Simulate completion after a short delay (in real implementation, wait for agent response)
  setTimeout(() => {
    job.lastRun = {
      timestamp: startTime,
      status: 'success',
      duration: Date.now() - startTime,
      output: 'Task completed',
    }
    job.nextRun = getNextRun(job.schedule)
    scheduleJob(job)
    broadcast({ type: 'cron:update', job })
  }, 2000)
}

export function removeCronJob(id: string) {
  const timer = state.timers.get(id)
  if (timer) {
    clearTimeout(timer)
    state.timers.delete(id)
  }
  state.jobs.delete(id)
}

export function toggleCronJob(id: string, enabled: boolean) {
  const job = state.jobs.get(id)
  if (!job) return
  job.enabled = enabled
  if (enabled) {
    job.nextRun = getNextRun(job.schedule)
    scheduleJob(job)
  } else {
    const timer = state.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      state.timers.delete(id)
    }
  }
  broadcast({ type: 'cron:update', job })
}

export function triggerCronJob(id: string) {
  const job = state.jobs.get(id)
  if (!job) return

  const startTime = Date.now()
  job.lastRun = { timestamp: startTime, status: 'running', duration: 0 }
  broadcast({ type: 'cron:update', job })

  sendToAgent(job.agentId, job.command)

  setTimeout(() => {
    job.lastRun = {
      timestamp: startTime,
      status: 'success',
      duration: Date.now() - startTime,
      output: 'Triggered manually',
    }
    broadcast({ type: 'cron:update', job })
  }, 1000)
}

export function getCronJobs(): CronJob[] {
  return Array.from(state.jobs.values())
}

export function getCronJob(id: string): CronJob | undefined {
  return state.jobs.get(id)
}

export function updateCronJob(id: string, updates: Partial<CronJob>) {
  const job = state.jobs.get(id)
  if (!job) return
  Object.assign(job, updates)
  if (job.enabled) {
    job.nextRun = getNextRun(job.schedule)
    scheduleJob(job)
  }
  broadcast({ type: 'cron:update', job })
}
