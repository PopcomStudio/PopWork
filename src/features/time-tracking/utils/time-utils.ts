export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
}

export function formatDurationReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  
  if (minutes > 0) {
    return `${minutes}m`
  }
  
  return `${seconds}s`
}

export function parseDuration(durationString: string): number {
  // Parse format like "2h 30m" or "45m" or "1h"
  const hours = durationString.match(/(\d+)h/)
  const minutes = durationString.match(/(\d+)m/)
  
  let totalSeconds = 0
  
  if (hours) {
    totalSeconds += parseInt(hours[1]) * 3600
  }
  
  if (minutes) {
    totalSeconds += parseInt(minutes[1]) * 60
  }
  
  return totalSeconds
}