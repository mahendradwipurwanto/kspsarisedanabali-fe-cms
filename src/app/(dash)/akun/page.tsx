'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { ShieldCheck, ShieldOff, Smartphone, Monitor, LogOut, Copy, KeyRound, RefreshCw, Check } from 'lucide-react'
import { security, type SecurityState, type SessionRow, currentSessionId } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Spinner, Button, Field, inputCls, Alert, Pill, fmtDateTime, fmtRelative } from '@/components/ui'

/**
 * Akun & Keamanan.
 *
 * Three things a person can do for their own account: switch a second
 * factor on (an authenticator app, with recovery codes for the day the
 * phone is lost), see and end the sessions signed in under their name, and
 * change their password. Everything here works on the caller's own account
 * only; user administration lives under Pengguna.
 */
export default function AccountPage() {
  const { reload, signOut } = useAuth()
  const params = useSearchParams()
  const [state, setState] = useState<SecurityState | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([security.me(), security.sessions()])
      setState(me); setSessions(list.data)
    } catch (e) {
      toast.error('Gagal memuat akun', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  if (loading || !state) return <Spinner />

  return (
    <>
      <PageHeader eyebrow="Sistem" title="Akun & keamanan" subtitle={`Masuk sebagai ${state.user.name} (${state.user.email}). Pengaturan di sini hanya untuk akun Anda sendiri.`} />

      {params.get('wajib') && !state.mfaEnabled ? (
        <div className="mb-5"><Alert tone="amber">Peran Anda wajib memakai verifikasi dua langkah. Aktifkan di bawah sebelum melanjutkan pekerjaan lain.</Alert></div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-5">
          <MfaCard state={state} onChange={async () => { await load(); await reload() }} />
          <PasswordCard />
        </div>
        <div className="grid min-w-0 content-start gap-5">
          <SessionsCard sessions={sessions} idleMinutes={state.session.idleMinutes} onChange={load} onSignedOut={signOut} />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------ MFA ------------------------------------ */

function MfaCard({ state, onChange }: { state: SecurityState; onChange: () => Promise<void> }) {
  const [step, setStep] = useState<'idle' | 'scan' | 'codes'>('idle')
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [disabling, setDisabling] = useState(false)

  async function start() {
    setBusy(true)
    try {
      const r = await security.mfaSetup()
      const qr = await QRCode.toDataURL(r.data.uri, { margin: 1, width: 220 })
      setSetup({ secret: r.data.secret, uri: r.data.uri, qr }); setStep('scan')
    } catch (e) { toast.error('Gagal memulai pengaturan', { description: (e as Error).message }) } finally { setBusy(false) }
  }

  async function enable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true)
    const code = String(new FormData(e.currentTarget).get('code') ?? '')
    try {
      const r = await security.mfaEnable(code)
      setCodes(r.recoveryCodes); setStep('codes')
      toast.success('Verifikasi dua langkah aktif', { description: 'Perangkat lain yang masuk tanpa kode sudah dikeluarkan.' })
      await onChange()
    } catch (err) { toast.error('Kode tidak diterima', { description: (err as Error).message }) } finally { setBusy(false) }
  }

  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
      await security.mfaDisable(String(fd.get('password') ?? ''), String(fd.get('code') ?? ''))
      toast.success('Verifikasi dua langkah dinonaktifkan'); setDisabling(false)
      await onChange()
    } catch (err) { toast.error('Gagal menonaktifkan', { description: (err as Error).message }) } finally { setBusy(false) }
  }

  async function regenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true)
    const code = String(new FormData(e.currentTarget).get('code') ?? '')
    try {
      const r = await security.mfaRecoveryCodes(code)
      setCodes(r.recoveryCodes); setStep('codes')
      await onChange()
    } catch (err) { toast.error('Gagal membuat kode baru', { description: (err as Error).message }) } finally { setBusy(false) }
  }

  const copyCodes = async () => { try { await navigator.clipboard.writeText(codes.join('\n')); toast.success('Kode pemulihan disalin') } catch { toast.error('Tidak bisa menyalin; catat secara manual') } }

  return (
    <Card title="Verifikasi dua langkah" description="Kode dari aplikasi autentikator (Google Authenticator, Authy, 1Password) diminta setiap kali masuk, di samping kata sandi.">
      <div className="flex flex-wrap items-center gap-2">
        {state.mfaEnabled
          ? <Pill tone="green" dot>Aktif{state.mfaVerifiedAt ? ` sejak ${fmtDateTime(state.mfaVerifiedAt)}` : ''}</Pill>
          : <Pill tone={state.mfaSetupRequired ? 'red' : 'amber'} dot>{state.mfaSetupRequired ? 'Wajib, belum aktif' : 'Belum aktif'}</Pill>}
        {state.mfaEnabled ? <Pill tone={state.recoveryCodesLeft <= 2 ? 'amber' : 'grey'}>{state.recoveryCodesLeft} kode pemulihan tersisa</Pill> : null}
        {state.session.mfa ? <Pill tone="grey">Sesi ini lolos kode</Pill> : null}
      </div>


      {step === 'codes' ? (
        <div className="mt-5">
          <p className="text-[13px] leading-relaxed text-ink-600">
            Simpan kode pemulihan ini di tempat aman. Masing-masing berlaku sekali, untuk masuk ketika ponsel tidak ada. Kode ini <strong className="text-ink-800">tidak akan ditampilkan lagi</strong>.
          </p>
          <ul className="mono mt-3 grid grid-cols-2 gap-1.5 rounded-[var(--radius-input)] border border-line bg-paper p-3 text-[13px] text-ink-800">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={copyCodes}><Copy className="size-3.5" /> Salin semua</Button>
            <Button type="button" variant="dark" size="sm" onClick={() => { setStep('idle'); setCodes([]) }}><Check className="size-3.5" /> Sudah saya simpan</Button>
          </div>
        </div>
      ) : !state.mfaEnabled && step === 'scan' && setup ? (
        <form onSubmit={enable} className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="Kode QR untuk aplikasi autentikator" width={220} height={220} className="rounded-[var(--radius-tile)] border border-line bg-white p-2" />
          <div className="grid content-start gap-3">
            <p className="text-[13px] leading-relaxed text-ink-600">Pindai kode QR ini dengan aplikasi autentikator, atau masukkan kunci ini secara manual:</p>
            <code className="mono block break-all rounded-[var(--radius-input)] border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-800">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
            <Field label="Kode 6 digit dari aplikasi" required>
              <input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={`${inputCls} mono tracking-[0.3em]`} placeholder="123456" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="dark" loading={busy}><ShieldCheck className="size-4" /> Aktifkan</Button>
              <Button type="button" variant="secondary" onClick={() => { setStep('idle'); setSetup(null) }}>Batal</Button>
            </div>
          </div>
        </form>
      ) : !state.mfaEnabled ? (
        <div className="mt-5">
          <p className="text-[13px] leading-relaxed text-ink-600">Butuh aplikasi autentikator di ponsel. Setelah aktif, perangkat lain yang sedang masuk akan diminta masuk lagi dengan kode.</p>
          <Button type="button" variant="dark" className="mt-3" onClick={start} loading={busy}><Smartphone className="size-4" /> Mulai pengaturan</Button>
        </div>
      ) : disabling ? (
        <form onSubmit={disable} className="mt-5 grid gap-3">
          <Alert tone="amber">Menonaktifkan berarti kata sandi saja cukup untuk masuk ke akun ini.</Alert>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kata sandi saat ini" required><input name="password" type="password" required autoComplete="current-password" className={inputCls} /></Field>
            <Field label="Kode dari aplikasi atau kode pemulihan" required><input name="code" required autoComplete="one-time-code" className={`${inputCls} mono`} /></Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={busy}><ShieldOff className="size-4" /> Nonaktifkan</Button>
            <Button type="button" variant="secondary" onClick={() => setDisabling(false)}>Batal</Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 grid gap-4">
          <form onSubmit={regenerate} className="grid gap-2 rounded-[var(--radius-input)] border border-line bg-paper p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="Buat kode pemulihan baru" hint="Kode lama langsung tidak berlaku. Masukkan kode dari aplikasi untuk membuktikan ini Anda.">
              <input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={`${inputCls} mono tracking-[0.3em]`} placeholder="123456" />
            </Field>
            <Button type="submit" variant="secondary" loading={busy}><RefreshCw className="size-3.5" /> Buat ulang</Button>
          </form>
          {!state.mfaSetupRequired ? (
            <div><Button type="button" variant="dangerGhost" size="sm" onClick={() => setDisabling(true)}><ShieldOff className="size-3.5" /> Nonaktifkan verifikasi dua langkah</Button></div>
          ) : (
            <p className="text-[12px] text-ink-400">Peran Anda mewajibkan verifikasi dua langkah; tidak bisa dinonaktifkan sendiri.</p>
          )}
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------- sessions ---------------------------------- */

function SessionsCard({ sessions, idleMinutes, onChange, onSignedOut }: { sessions: SessionRow[]; idleMinutes: number; onChange: () => Promise<void>; onSignedOut: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const mine = currentSessionId()

  async function end(id: string) {
    setBusy(id)
    try {
      const r = await security.endSession(id)
      if (r.current) { toast('Sesi ini diakhiri'); await onSignedOut(); return }
      toast.success('Sesi diakhiri'); await onChange()
    } catch (e) { toast.error('Gagal mengakhiri sesi', { description: (e as Error).message }) } finally { setBusy(null) }
  }
  async function endOthers() {
    setBusy('others')
    try { const r = await security.endOtherSessions(); toast.success(r.ended ? `${r.ended} sesi lain diakhiri` : 'Tidak ada sesi lain'); await onChange() }
    catch (e) { toast.error('Gagal', { description: (e as Error).message }) } finally { setBusy(null) }
  }

  const hours = Math.round(idleMinutes / 60)
  return (
    <Card
      title="Sesi yang sedang masuk"
      description={`Setiap perangkat yang masuk dengan akun Anda. Sesi berakhir sendiri setelah ${hours} jam tidak dipakai; mengakhiri sesi di sini berlaku seketika.`}
      action={sessions.length > 1 ? <Button type="button" variant="secondary" size="sm" onClick={endOthers} loading={busy === 'others'}><LogOut className="size-3.5" /> Keluar dari perangkat lain</Button> : undefined}
    >
      <ul className="divide-y divide-line">
        {sessions.map((s) => {
          const current = s.current || s.id === mine
          const phone = /iOS|Android/.test(s.label)
          return (
            <li key={s.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-paper text-ink-500 ring-1 ring-inset ring-line">
                {phone ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink-900">{s.label}</span>
                  {current ? <Pill tone="green" dot>Perangkat ini</Pill> : null}
                  {s.mfa ? <Pill tone="grey">kode terverifikasi</Pill> : null}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-500">
                  {s.ip ? <span className="mono">{s.ip}</span> : 'alamat tidak tercatat'} · terakhir aktif {s.lastSeenAt ? fmtRelative(s.lastSeenAt) : fmtRelative(s.createdAt)} · masuk {fmtDateTime(s.createdAt)}
                </span>
              </span>
              <Button type="button" variant={current ? 'dangerGhost' : 'secondary'} size="xs" onClick={() => end(s.id)} loading={busy === s.id}>
                {current ? 'Keluar' : 'Akhiri'}
              </Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ---------------------------------- password ---------------------------------- */

function PasswordCard() {
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true)
    const form = e.currentTarget; const fd = new FormData(form)
    const next = String(fd.get('next') ?? ''), again = String(fd.get('again') ?? '')
    if (next !== again) { toast.error('Kata sandi baru dan ulangannya tidak sama.'); setBusy(false); return }
    try {
      await security.changePassword(String(fd.get('current') ?? ''), next)
      toast.success('Kata sandi diganti', { description: 'Perangkat lain harus masuk lagi.' }); form.reset()
    } catch (err) { toast.error('Gagal mengganti kata sandi', { description: (err as Error).message }) } finally { setBusy(false) }
  }
  return (
    <Card title="Kata sandi" description="Minimal 10 karakter. Mengganti kata sandi mengeluarkan semua perangkat lain.">
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Kata sandi saat ini" required><input name="current" type="password" required autoComplete="current-password" className={inputCls} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kata sandi baru" required><input name="next" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <Field label="Ulangi kata sandi baru" required><input name="again" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
        </div>
        <div><Button type="submit" variant="dark" loading={busy}><KeyRound className="size-4" /> Ganti kata sandi</Button></div>
      </form>
    </Card>
  )
}
