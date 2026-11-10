import type { Analysis, Insight } from './ai-insights-types'

const INSIGHT_COLORS: Record<Insight['type'], string> = {
  warning: 'bg-rose-500/10 text-rose-300',
  tip:     'bg-indigo-500/10 text-indigo-300',
  good:    'bg-emerald-500/10 text-emerald-300',
}

/** A score of 70 or more is healthy, 40 or more is middling. */
function scoreTone(score: number) {
  if (score >= 70) return { text: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 40) return { text: 'text-amber-400', bar: 'bg-amber-400' }
  return { text: 'text-rose-400', bar: 'bg-rose-400' }
}

function Callout({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-white/45 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-slate-200">{text}</p>
      </div>
    </div>
  )
}

/** The finished analysis: score and summary, the two callouts, then the insights. */
export function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const tone = scoreTone(analysis.score)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center">
          <p className={`text-3xl font-bold tabular-nums leading-none ${tone.text}`}>{analysis.score}</p>
          <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">score</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full animate-bar-fill ${tone.bar}`} style={{ width: `${analysis.score}%` }} />
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
        </div>
      </div>
      {analysis.topSpend && <Callout icon="🏆" label="Top spending" text={analysis.topSpend} />}
      {analysis.assets && <Callout icon="💼" label="Current assets" text={analysis.assets} />}
      <div className="space-y-2">
        {analysis.insights.map((ins, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 animate-fade-up ${INSIGHT_COLORS[ins.type]}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-base shrink-0 mt-0.5">{ins.emoji}</span>
            <p className="text-sm leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
