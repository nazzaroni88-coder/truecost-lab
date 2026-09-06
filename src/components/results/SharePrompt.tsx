import { useEffect, useRef } from 'react';
import { renderShareCard } from '../../share/shareCard';
import { Button } from '../ui/Button';
import { IconLink, IconShare } from '../ui/Icons';
import { useToast } from '../ui/Toast';
import { useShare } from './ShareContext';

/** Small enough to be cheap to redraw on every keystroke, large enough to survive downscaling. */
const THUMB_SCALE = 0.5;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * The invitation to share, placed where the answer actually lands.
 *
 * The utility bar above the result is a row of quiet buttons a reader scrolls past on the way to
 * the number. This sits directly under the answer, at the moment a figure has just surprised
 * someone — and it shows the card rather than describing it, because what gets posted is an image
 * and nobody shares an image they have not seen.
 *
 * It stays silent when the app has told the reader an input is out of range: a result the product
 * itself says not to trust is not one to encourage anyone to publish.
 */
export function SharePrompt() {
  const share = useShare();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const summary = share?.summary;
  const hidden = !share || share.blocked;

  useEffect(() => {
    if (hidden || !summary) return;
    const c = canvasRef.current;
    if (!c) return;
    const draw = () => renderShareCard(c, { calculatorName: share.calculatorName, scenarioName: share.scenarioName, summary }, 'portrait', THUMB_SCALE);
    draw();
    // Redraw once Inter is available, or the thumbnail keeps the fallback face's metrics.
    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
        if (canvasRef.current === c) draw();
      });
    }
  }, [hidden, summary, share?.calculatorName, share?.scenarioName]);

  if (hidden || !share) return null;

  return (
    <section className="share-prompt no-print" aria-labelledby="share-prompt-heading">
      <button type="button" className="thumb" onClick={share.open} aria-label="Preview and share this result as an image">
        <canvas ref={canvasRef} aria-hidden="true" />
      </button>
      <div className="body">
        <div className="eyebrow">Share this answer</div>
        <p id="share-prompt-heading">The winner, the gap and what drives it — as an image for a post or story, or a link that opens this exact scenario.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={<IconShare />} onClick={share.open}>
            Get the image
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconLink />}
            onClick={async () => {
              toast((await copy(share.url)) ? 'Link copied — anyone who opens it sees this exact scenario' : 'Could not copy. Select the link manually.');
            }}
          >
            Copy link
          </Button>
        </div>
      </div>
    </section>
  );
}
