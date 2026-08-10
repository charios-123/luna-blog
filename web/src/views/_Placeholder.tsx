export default function Placeholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="container-page py-16 animate-[fade-up_0.5s_ease-out]">
      <h2 className="section-title inline-block">{title}</h2>
      <div
        className="card p-10 text-center mt-6"
        style={{ borderRadius: 'var(--radius-xl)' }}
      >
        <div className="text-5xl mb-4 opacity-70">🌿</div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
          {title} 页面建设中
        </h3>
        {subtitle && (
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        <p className="mt-4 text-sm" style={{ color: 'var(--text-subtle)' }}>
          React 版本的该页面将在后续阶段完成，逻辑与原 Vue 端完全一致，界面采用全新 leaf 清新风格。
        </p>
      </div>
    </div>
  )
}
