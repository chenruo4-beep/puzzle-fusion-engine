import { Component } from 'react';
import { View, Text, Button } from '@tarojs/components';
import { getCheckins, completeCheckin, CheckIn } from '../../services/api';
import './index.scss';

interface State {
  checkins: CheckIn[];
  loading: boolean;
}

export default class Checkin extends Component<object, State> {
  state: State = {
    checkins: [],
    loading: true,
  };

  componentDidShow() {
    this.loadCheckins();
  }

  async loadCheckins() {
    this.setState({ loading: true });
    try {
      const checkins = await getCheckins();
      this.setState({ checkins });
    } catch {
      // silencio
    } finally {
      this.setState({ loading: false });
    }
  }

  async handleComplete(id: number) {
    try {
      await completeCheckin(id);
      this.loadCheckins();
    } catch {
      // silencio
    }
  }

  render() {
    const { checkins, loading } = this.state;
    const completed = checkins.filter((c) => c.status === 'completed').length;
    const active = checkins.filter((c) => c.status !== 'completed');

    return (
      <View className="container">
        <Text className="title">迈出第一步</Text>
        <Text className="subtitle">每天一个小行动，拼出更好的自己</Text>

        {/* 统计 */}
        <View className="stats-card card">
          <Text className="stats-number">{completed}</Text>
          <Text className="stats-label">已完成</Text>
        </View>

        {loading ? (
          <Text className="loading">加载中...</Text>
        ) : checkins.length === 0 ? (
          <View className="empty-hint">
            <Text>还没有打卡记录。去融合一个方向，迈出第一步吧。</Text>
          </View>
        ) : (
          <View>
            {/* 待完成 */}
            {active.length > 0 && (
              <View>
                <Text className="section-label">待完成</Text>
                {active.map((c) => (
                  <View key={c.id} className="card" style="display:flex; align-items:center; justify-content:space-between;">
                    <View style="flex:1">
                      <Text style="font-size:14px; font-weight:500; color:#3c3a37; display:block;">
                        {c.title}
                      </Text>
                      {c.action && (
                        <Text style="font-size:12px; color:#b8a088; display:block; margin-top:2px;">
                          {c.action}
                        </Text>
                      )}
                    </View>
                    <Button className="btn-small" onClick={() => this.handleComplete(c.id)}>
                      完成
                    </Button>
                  </View>
                ))}
              </View>
            )}

            {/* 已完成 */}
            {active.length > 0 && completed > 0 && <View style="height:16px" />}
            {completed > 0 && (
              <View>
                <Text className="section-label">已完成</Text>
                {checkins.filter((c) => c.status === 'completed').map((c) => (
                  <View key={c.id} className="card" style="display:flex; align-items:center; justify-content:space-between;">
                    <View>
                      <Text style="font-size:14px; font-weight:500; color:#3c3a37; display:block;">
                        {c.title}
                      </Text>
                      <Text style="font-size:12px; color:#b8a088;">
                        {c.completed_at?.slice(0, 10) || ''}
                      </Text>
                    </View>
                    <Text style="font-size:20px;">✅</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
}
