/**
 * sendEmail.ts
 *
 * Sends a cancellation email via the backend Resend integration.
 * The API key never leaves the server — this function only calls /api/send-email.
 *
 * Usage:
 *   import { sendCancellationEmail } from './sendEmail'
 *   const result = await sendCancellationEmail('Netflix')
 */

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a cancellation request email for the given subscription.
 *
 * @param subscriptionName  Human-readable service name (e.g. "Netflix Premium")
 * @param toEmail           Override recipient; defaults to the server's TEST_EMAIL
 * @returns                 { success, messageId?, error? }
 */
export async function sendCancellationEmail(
  subscriptionName: string,
  toEmail?: string,
): Promise<SendEmailResult> {
  try {
    const body: Record<string, string> = { subscription_name: subscriptionName }
    if (toEmail) body.to_email = toEmail

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.detail ?? `Server error ${res.status}` }
    }

    return { success: true, messageId: data.message_id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error — backend unreachable',
    }
  }
}
