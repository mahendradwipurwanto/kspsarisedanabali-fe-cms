import { toast } from 'sonner'

/** Every write the API answers tells us whether the website took the change. */
export interface Refreshable {
  refreshed?: boolean
  refreshError?: string
}

/**
 * Reports a save, and says so plainly when the website was not refreshed.
 *
 * The console used to answer every save with "Website sudah diperbarui",
 * whether or not the website had been told anything. When the API cannot reach
 * the site — a wrong address, a mismatched secret — an editor sees a green
 * message, goes to the site, finds their change missing, and has nothing to go
 * on. The change is saved either way; what differs is how long until it shows.
 */
export function toastSaved(res: Refreshable | undefined, message: string, description?: string) {
  if (res?.refreshed === false) {
    toast.warning(`${message}, tetapi website belum disegarkan`, {
      description: res.refreshError
        ? `${res.refreshError} Perubahan tetap tersimpan dan akan muncul sendiri setelah cache website kedaluwarsa.`
        : 'Perubahan tetap tersimpan dan akan muncul sendiri setelah cache website kedaluwarsa.',
      duration: 12_000,
    })
    return
  }
  toast.success(message, description ? { description } : undefined)
}
