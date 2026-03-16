import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useLogin } from "@refinedev/core";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";

interface LoginFormValues {
  username: string;
  password: string;
}

export function LoginPage() {
  const { mutateAsync: login, isLoading } = useLogin<LoginFormValues>();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="login-page">
      <Card className="login-card" bordered>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          CCIC 管理后台
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
          使用管理员账号登录
        </Typography.Paragraph>

        {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={async (values) => {
            setError(null);
            const result = await login(values);

            if (result?.success === false) {
              setError(result.error?.message || "登录失败");
            }
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Button htmlType="submit" type="primary" block loading={isLoading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
