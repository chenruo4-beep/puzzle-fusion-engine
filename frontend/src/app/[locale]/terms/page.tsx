import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款",
  description: "拼拼看Me服务条款 — 使用本服务前请仔细阅读",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <article className="max-w-3xl mx-auto prose prose-indigo dark:prose-invert">
        <h1>服务条款</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          最后更新日期：2026年5月24日
        </p>

        <h2>1. 服务说明</h2>
        <p>
          拼拼看Me（以下简称&ldquo;本服务&rdquo;）是一款帮助用户整理思维碎片、发现隐藏能力的工具。
          本服务由拼拼看Me团队运营和维护。
        </p>

        <h2>2. 账户注册</h2>
        <ul>
          <li>你需要提供有效的邮箱地址来注册账户</li>
          <li>你应当保管好自己的账户信息，对账户下的所有活动负责</li>
          <li>每人仅限注册一个账户</li>
          <li>如发现未经授权的账户使用，请立即通知我们</li>
        </ul>

        <h2>3. 用户内容</h2>
        <ul>
          <li>你保留对你输入的所有内容的完整所有权</li>
          <li>你授予本服务有限的许可，仅用于提供和改进服务</li>
          <li>你应对自己输入的内容负责，确保不侵犯他人权利</li>
          <li>我们不会用你的内容训练AI模型或分享给第三方</li>
        </ul>

        <h2>4. 免费版与付费版</h2>
        <p>本服务提供免费版和专业版：</p>
        <ul>
          <li>
            <strong>免费版</strong>：每月50个碎片、25次融合，基础功能
          </li>
          <li>
            <strong>专业版</strong>：无限碎片和融合，高级分析，优先支持
          </li>
        </ul>
        <p>
          专业版订阅按月/年计费，可随时取消。取消后将在当前计费周期结束时降级为免费版。
        </p>

        <h2>5. 退款政策</h2>
        <ul>
          <li>7天试用期内取消，不收取任何费用</li>
          <li>试用期后，已计费周期不予退款</li>
          <li>因服务故障导致的扣费，我们将主动退款</li>
        </ul>

        <h2>6. 服务可用性</h2>
        <p>
          我们努力保持99.9%的服务可用性，但不对因维护、更新或不可抗力导致的服务中断负责。
          重大维护将提前通知。
        </p>

        <h2>7. 禁止行为</h2>
        <ul>
          <li>不得利用本服务从事违法活动</li>
          <li>不得尝试破坏系统安全或未经授权访问他人数据</li>
          <li>不得批量抓取或自动化访问本服务</li>
          <li>不得冒充他人或提供虚假信息</li>
        </ul>

        <h2>8. 免责声明</h2>
        <p>
          本服务提供的融合分析和建议仅供参考，不构成专业建议。
          对于基于本服务分析结果做出的任何决策，我们不承担责任。
          产品的价值在于帮助你思考，而不是替你思考。
        </p>

        <h2>9. 条款变更</h2>
        <p>
          我们保留修改本条款的权利。重大变更将通过邮件或应用内通知提前30天告知。
          继续使用服务即表示你同意变更后的条款。
        </p>

        <h2>10. 联系方式</h2>
        <p>
          如有任何问题，请联系：
          <a href="mailto:support@pinpinkan.me">support@pinpinkan.me</a>
        </p>
      </article>
    </div>
  );
}
