'use client'

import { Form, Input, Button, Alert } from 'antd'
import { useState, useTransition } from 'react'
import { login } from './actions'

type FormValues = {
  email: string
  password: string
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFinish(values: FormValues) {
    setError(null)
    startTransition(async () => {
      const result = await login(values.email, values.password)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Form layout="vertical" onFinish={handleFinish}>
      <h1 style={{ marginBottom: 24 }}>Masuk</h1>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email wajib diisi' }]}>
        <Input autoComplete="username" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Password wajib diisi' }]}
      >
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={isPending}>
          Masuk
        </Button>
      </Form.Item>
    </Form>
  )
}
