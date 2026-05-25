import { Component } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import { getFragments, Fragment } from '../../services/api';
import './index.scss';

export const config = {
  enableShareAppMessage: true,
  enableShareTimeline: true,
};

export default class Fragments extends Component {
  state = {
    fragments: [] as Fragment[],
    loading: true,
  };

  componentDidShow() {
    this.loadFragments();
  }

  async loadFragments() {
    this.setState({ loading: true });
    try {
      const fragments = await getFragments();
      this.setState({ fragments });
    } catch {
      // silencio
    } finally {
      this.setState({ loading: false });
    }
  }

  onShareAppMessage() {
    return {
      title: '我的碎片 - 拼拼看Me',
      path: '/pages/fragments/index',
    };
  }

  onShareTimeline() {
    return {
      title: '我的碎片 - 拼拼看Me',
    };
  }

  render() {
    const { fragments, loading } = this.state;

    return (
      <View className="container">
        <Text className="title">我的碎片</Text>
        <Text className="subtitle">
          {fragments.length > 0
            ? `你已收集了 ${fragments.length} 块碎片`
            : '你的碎片会在这里慢慢出现'}
        </Text>

        {loading ? (
          <View className="loading">加载中...</View>
        ) : fragments.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">🧩</Text>
            <Text className="empty-text">还没有捡到新的碎片</Text>
            <Text className="empty-hint">不急，碎片会在你的随手记里慢慢浮现。</Text>
          </View>
        ) : (
          <ScrollView scrollY className="fragment-list">
            {fragments.map((f) => (
              <View key={f.id} className="fragment-chip">
                <Text className="tag">{f.fragment_type}</Text>
                <Text style="flex:1;fontSize:14px;color:#3c3a37;marginLeft:8px;">
                  {f.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 分享按钮 */}
        <Button className="share-btn" openType="share" style="margin-top:16px;">分享给朋友</Button>
      </View>
    );
  }
}
