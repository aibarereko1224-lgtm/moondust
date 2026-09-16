import { useState, type FormEvent } from 'react'

interface AuthPanelProps {
  active: boolean
  configured: boolean
  error: string | null
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string, username: string) => Promise<{ needsEmailConfirmation: boolean }>
}

export function AuthPanel({ active, configured, error, onClose, onLogin, onRegister }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!configured) return
    setSubmitting(true)
    setMessage(null)
    try {
      if (mode === 'login') {
        await onLogin(email, password)
        onClose()
      } else {
        const result = await onRegister(email, password, username.trim())
        if (result.needsEmailConfirmation) setMessage('注册成功，请前往邮箱确认后再登录。')
        else onClose()
      }
    } catch {
      // The parent auth hook exposes the Supabase error in the panel.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`auth-panel glass-panel ${active ? 'active' : ''}`}>
      <button className="modal-close-btn" onClick={onClose} type="button">×</button>
      <div className="auth-panel-content">
        <span className="auth-kicker">MOON DUST</span>
        <h2>{mode === 'login' ? '回到你的私人空间' : '建立你的私人空间'}</h2>
        <p className="auth-intro">电影、书页，以及只属于你的安静记录。</p>

        <div className="auth-mode-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage(null) }} type="button">登录</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage(null) }} type="button">注册</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} placeholder="用户名" required value={username} />}
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
          <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
          {!configured && <p className="auth-status auth-status-warning">尚未配置 Supabase。请在本地 `.env.local` 中填写 URL 与 anon key。</p>}
          {error && <p className="auth-status auth-status-error">{error}</p>}
          {message && <p className="auth-status auth-status-success">{message}</p>}
          <button className="review-action-btn root-btn auth-submit" disabled={!configured || submitting} type="submit">
            {submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
