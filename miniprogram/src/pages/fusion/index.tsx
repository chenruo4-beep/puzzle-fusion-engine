import { Component } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import { getFragments, fuseFragments, Fragment, FusionResult } from '../../services/api';
import './index.scss';

interface State {
  fragments: Fragment[];
  selected: number[];
  profession: string;
  result: FusionResult | null;
  loading: boolean;
  fusing: boolean;
}

export default class Fusion extends Component<object, State> {
  state: State = {
    fragments: [],
    selected: [],
    profession: '',
    result: null,
    loading: true,
    fusing: false,
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

  toggleFragment(id: number) {
    const { selected } = this.state;
    if (selected.includes(id)) {
      this.setState({ selected: selected.filter((s) => s !== id) });
    } else {
      this.setState({ selected: [...selected, id] });
    }
  }

  async doFuse() {
    const { fragments, selected, profession } = this.state;
    const selectedFrags = fragments
      .filter((f) => selected.includes(f.id))
      .map((f) => ({ type: f.fragment_type, content: f.content }));

    if (selectedFrags.length < 2) return;

    this.setState({ fusing: true, result: null });
    try {
      const result = await fuseFragments(profession || '未知', selectedFrags);
      this.setState({ result });
    } catch {
      // silencio
    } finally {
      this.setState({ fusing: false });
    }
  }

  render() {
    const { fragments, selected, result, loading, fusing } = this.state;

    return (
      <View className="container">
        <Text className="title">拼个方向</Text>
        <Text className="subtitle">选几块碎片，拼拼看能出来什么</Text>

        {/* 职业输入 */}
        <View className="card">
          <Text style="font-size:13px; color:#b8a088; margin-bottom:6px; display:block;">你的职业</Text>
          <input
            className="profession-input"
            placeholder="比如：程序员、老师、外卖骑手..."
            value={this.state.profession}
            onInput={(e) => this.setState({ profession: (e.target as any).value || '' })}
          />
        </View>

        {/* 碎片选择 */}
        <ScrollView scrollY className="fragment-scroll">
          {loading ? (
            <Text className="loading-text">加载中...</Text>
          ) : fragments.length === 0 ? (
            <View className="empty-state">
              <Text>还没有碎片，先去记录一些吧</Text>
            </View>
          ) : (
            fragments.map((f) => {
              const isSelected = selected.includes(f.id);
              return (
                <View
                  key={f.id}
                  className={`frag-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => this.toggleFragment(f.id)}
                >
                  <View className={`checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected ? '✓' : ''}
                  </View>
                  <Text className="tag">{f.fragment_type}</Text>
                  <Text className="frag-text">{f.content}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* 融合按钮 */}
        {selected.length >= 2 && (
          <Button className="btn-primary" onClick={() => this.doFuse()} loading={fusing}>
            {fusing ? '拼合中...' : `拼拼看这 ${selected.length} 块`}
          </Button>
        )}

        {/* 结果 */}
        {result && (
          <View className="result-card">
            <Text className="result-golden">{result.golden_sentence}</Text>
            <Text className="result-confidence">置信度: {result.confidence}%</Text>
            {result.directions.length > 0 && (
              <View className="result-directions">
                {result.directions.map((d: any, i: number) => (
                  <View key={i} className="direction-card">
                    <Text className="direction-title">{d.title}</Text>
                    <Text className="direction-desc">{d.why_this_works}</Text>
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
