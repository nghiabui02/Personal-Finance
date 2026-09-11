import { SegmentNav, type Segment } from '@/components/ui/segment-nav'
import { Verdict } from '@/components/ui/verdict'

/**
 * Every screen opens the same way: a sentence saying where things stand, then
 * the controls for acting on it. Screens used to each invent their own header
 * — a dark panel here, a stat row there — which made the app feel like several
 * apps stitched together.
 */
export function ScreenHeader({
  eyebrow,
  headline,
  support,
  segments,
  controls,
  action,
}: {
  eyebrow?: React.ReactNode
  headline: React.ReactNode
  support?: React.ReactNode
  /** Sibling screens under the same bottom-nav tab. */
  segments?: Segment[]
  /** Filters or view switches that belong to this screen only. */
  controls?: React.ReactNode
  /** The screen's primary action. */
  action?: React.ReactNode
}) {
  const hasBar = segments || controls || action

  return (
    <div className="mb-5">
      <Verdict eyebrow={eyebrow} headline={headline} support={support} />
      {hasBar && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {segments && <SegmentNav items={segments} />}
            {controls}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  )
}
