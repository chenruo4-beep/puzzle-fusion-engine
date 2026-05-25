import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "拼拼看Me隐私政策 — 我们如何收集、使用和保护你的个人信息",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <article className="max-w-3xl mx-auto prose prose-indigo dark:prose-invert">
        <h1>隐私政策</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          最后更新日期：2026年5月24日
        </p>

        <h2>1. 我们收集哪些信息</h2>
        <p>
          拼拼看Me 致力于收集最少必要的信息来为你提供服务。我们收集的信息包括：
        </p>
        <ul>
          <li>
            <strong>账户信息</strong>：注册时提供的邮箱地址和加密后的密码
          </li>
          <li>
            <strong>用户内容</strong>：你主动输入的碎片、日记、融合结果等内容
          </li>
          <li>
            <strong>使用数据</strong>：功能使用频率、操作时长等匿名统计信息
          </li>
          <li>
            <strong>设备信息</strong>：浏览器类型、操作系统（用于兼容性优化）
          </li>
        </ul>

        <h2>2. 我们如何使用你的信息</h2>
        <p>你的信息仅用于以下目的：</p>
        <ul>
          <li>提供和维护拼拼看Me的核心服务（碎片管理、融合分析）</li>
          <li>改进产品体验和推荐算法</li>
          <li>发送与你账户相关的重要通知</li>
          <li>防止欺诈和滥用行为</li>
        </ul>
        <p>
          我们<strong>不会</strong>将你的个人信息出售给第三方，也
          <strong>不会</strong>用你的内容训练AI模型。
        </p>

        <h2>3. 信息存储与安全</h2>
        <ul>
          <li>所有数据传输使用 HTTPS/TLS 加密</li>
          <li>密码使用 bcrypt 单向加密存储，我们无法读取你的明文密码</li>
          <li>JWT Token 设置7天有效期，支持随时撤销</li>
          <li>数据库访问严格受限，仅授权服务可连接</li>
        </ul>

        <h2>4. 数据保留与删除</h2>
        <ul>
          <li>活跃账户的数据持续保留</li>
          <li>你可以随时导出自己的所有数据</li>
          <li>
          账户删除请求将在30天内完成，删除后数据不可恢复
          </li>
        </ul>

        <h2>5. 第三方服务</h2>
        <p>我们可能使用以下第三方服务：</p>
        <ul>
          <li>
            <strong>支付服务</strong>：Stripe（处理支付信息，我们不存储信用卡号）
          </li>
          <li>
            <strong>错误监控</strong>：Sentry（仅收集错误日志，不含用户内容）
          </li>
          <li>
            <strong>托管服务</strong>：Vercel / 云服务商（受其隐私政策约束）
          </li>
        </ul>

        <h2>6. Cookie 政策</h2>
        <p>
          我们使用必要的 Cookie 来维持登录状态（JWT Token）。
          不使用追踪类 Cookie 或第三方广告 Cookie。
        </p>

        <h2>7. 儿童隐私</h2>
        <p>
          拼拼看Me 不面向14岁以下用户。我们不会故意收集儿童的个人信息。
        </p>

        <h2>8. 政策变更</h2>
        <p>
          我们可能会不时更新本政策。重大变更将通过邮件或应用内通知告知你。
          继续使用服务即表示你同意更新后的政策。
        </p>

        <h2>9. 联系我们</h2>
        <p>
          如有任何隐私相关问题，请发送邮件至：
          <a href="mailto:privacy@pinpinkan.me">privacy@pinpinkan.me</a>
        </p>
      </article>
    </div>
  );
}
