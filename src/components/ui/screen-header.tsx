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
      {/* The bar wraps rather than squeezes: a screen carrying a segment nav,
          a period switcher and a period stepper cannot fit them on one phone
          row, and overflowing put the action on top of the label. */}
      {hasBar && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
            {segments && <SegmentNav items={segments} />}
            {controls}
          </div>
          {action && <div className="shrink-0 ml-auto">{action}</div>}
        </div>
      )}
    </div>
  )
}
