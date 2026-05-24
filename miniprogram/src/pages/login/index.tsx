import { Component } from 'react';
import { View, Text, Input, Button, Navigator } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { login, register, setToken } from '../../services/api';
import './index.scss';

interface State {
  mode: 'login' | 'register';
  email: string;
  password: string;
  confirm: string;
  loading: boolean;
  error: string;
}

export default class Login extends Component<object, State> {
  state: State = {
    mode: 'login',
    email: '',
    password: '',
    confirm: '',
    loading: false,
    error: '',
  };

  switchMode() {
    this.setState((prev) => ({
      mode: prev.mode === 'login' ? 'register' : 'login',
      error: '',
    }));
  }

  async doSubmit() {
    const { mode, email, password, confirm } = this.state;

    if (!email.trim()) { this.setState({ error: '请输入邮箱' }); return; }
    if (!password) { this.setState({ error: '请输入密码' }); return; }
    if (mode === 'register' && password !== confirm) {
      this.setState({ error: '两次密码不一致' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      const res = mode === 'login'
        ? await login(email.trim(), password)
        : await register(email.trim(), password);

      setToken(res.access_token);

      Taro.showToast({ title: mode === 'login' ? '登录成功' : '注册成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 500);
    } catch (err: any) {
      this.setState({ error: err.message || '操作失败' });
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    const { mode, email, password, confirm, loading, error } = this.state;

    return (
      <View className="login-page">
        <View className="login-card">
          {/* 品牌 */}
          <Text className="brand">拼拼看Me</Text>
          <Text className="login-title">{mode === 'login' ? '欢迎回来' : '创建账号'}</Text>
          <Text className="login-subtitle">
            {mode === 'login' ? '登录后继续你的拼图之旅' : '2 分钟完成注册，马上开始'}
          </Text>

          {/* 表单 */}
          <View className="form">
            <View className="field">
              <Text className="field-label">邮箱</Text>
              <Input
                className="field-input"
                placeholder="your@email.com"
                value={email}
                onInput={(e) => this.setState({ email: (e.target as any).value || '' })}
                type="text"
              />
            </View>

            <View className="field">
              <Text className="field-label">密码</Text>
              <Input
                className="field-input"
                placeholder="至少 6 位"
                value={password}
                onInput={(e) => this.setState({ password: (e.target as any).value || '' })}
                password
              />
            </View>

            {mode === 'register' && (
              <View className="field">
                <Text className="field-label">确认密码</Text>
                <Input
                  className="field-input"
                  placeholder="再次输入密码"
                  value={confirm}
                  onInput={(e) => this.setState({ confirm: (e.target as any).value || '' })}
                  password
                />
              </View>
            )}
          </View>

          {/* 错误提示 */}
          {error && <Text className="login-error">{error}</Text>}

          {/* 提交按钮 */}
          <Button className="btn-primary" onClick={() => this.doSubmit()} loading={loading} disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
          </Button>

          {/* 切换模式 */}
          <Text className="switch-mode" onClick={() => this.switchMode()}>
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </Text>

          {/* 跳过 */}
          <Navigator url="/pages/fragments/index" className="skip-link" openType="navigate">
            先逛逛
          </Navigator>
        </View>
      </View>
    );
  }
}
