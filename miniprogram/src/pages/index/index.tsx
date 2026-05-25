import { Component } from 'react';
import { View, Text, Navigator, Button } from '@tarojs/components';
import { getToken, clearToken } from '../../services/api';
import './index.scss';

export const config = {
  enableShareAppMessage: true,
  enableShareTimeline: true,
};

interface State {
  loggedIn: boolean;
}

export default class Index extends Component<object, State> {
  state: State = {
    loggedIn: false,
  };

  componentDidShow() {
    this.setState({ loggedIn: getToken() !== null });
  }

  handleLogout() {
    clearToken();
    this.setState({ loggedIn: false });
  }

  onShareAppMessage() {
    return {
      title: '拼拼看Me - 拼出更好的自己',
      path: '/pages/index/index',
    };
  }

  onShareTimeline() {
    return {
      title: '拼拼看Me - 拼出更好的自己',
    };
  }

  render() {
    const { loggedIn } = this.state;

    return (
      <View className="index-page">
        {/* 品牌区 */}
        <View className="hero">
          <Text className="brand">拼拼看Me</Text>
          <Text className="hero-title">
            你本来就有的东西，
            {'\n'}拼出一个自己
          </Text>
          <Text className="hero-desc">
            你身上散落着很多碎片——你的经验、直觉、被夸过但自己没当真的小事。Me 帮你把它们捡起来，拼拼看。
          </Text>

          {/* 登录/注册 按钮 */}
          {loggedIn ? (
            <Navigator url="/pages/fragments/index" className="btn-primary">
              继续拼图
            </Navigator>
          ) : (
            <Navigator url="/pages/login/index" className="btn-primary">
              登录 / 注册
            </Navigator>
          )}

          <Text className="hero-footnote">2 分钟完成入门</Text>
        </View>

        {/* 用户操作 */}
        <View className="user-section">
          {loggedIn && (
            <Text className="logout-link" onClick={() => this.handleLogout()}>
              退出登录
            </Text>
          )}
        </View>

        {/* 三步简介 */}
        <View className="steps-section">
          <View className="step-card">
            <Text className="step-num">1</Text>
            <View className="step-content">
              <Text className="step-title">存进去</Text>
              <Text className="step-desc">把你会的、喜欢的、做过的——不管大小，先存进去。</Text>
            </View>
          </View>
          <View className="step-card">
            <Text className="step-num">2</Text>
            <View className="step-content">
              <Text className="step-title">拼起来</Text>
              <Text className="step-desc">Me 自动扫描你的碎片，找到隐藏的连接，拼出方向。</Text>
            </View>
          </View>
          <View className="step-card">
            <Text className="step-num">3</Text>
            <View className="step-content">
              <Text className="step-title">试一试</Text>
              <Text className="step-desc">每个方向都有具体的第一步，打开手机就能做。</Text>
            </View>
          </View>
        </View>

        {/* 导航链接 */}
        <View className="nav-section">
          <Navigator url="/pages/fragments/index" className="nav-btn">🧩 我的碎片</Navigator>
          <Navigator url="/pages/fusion/index" className="nav-btn">✨ 碎片融合</Navigator>
          <Navigator url="/pages/checkin/index" className="nav-btn">✅ 打卡记录</Navigator>
        </View>

        {/* 分享按钮 */}
        <View className="share-section">
          <Button className="share-btn" openType="share">分享给朋友</Button>
        </View>
      </View>
    );
  }
}
