import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <LoginForm />
      </div>
    </div>
  )
}
