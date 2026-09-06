import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShareSummary } from '../../calculators/types';
import { buildShareUrl } from '../../scenarios/urlCodec';
import { canvasToBlob, renderShareCard } from '../../share/shareCard';
import { buildSummaryText } from '../../share/summaryText';
import { Button } from '../ui/Button';
import { IconCopy, IconDownload, IconLink, IconPrint, IconShare } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface Props<I> {
  calculatorId: string;
  calculatorName: string;
  path: string;
  scenarioName: string;
  inputs: I;
  summary: ShareSummary;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ShareBar<I>({ calculatorId, calculatorName, path, scenarioName, inputs, summary }: Props<I>) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const url = buildShareUrl({ calculatorId, name: scenarioName, inputs }, path);
  const text = buildSummaryText(calculatorName, summary, url, scenarioName);

  const onCopyLink = async () => {
    toast((await copyText(url)) ? 'Link copied — anyone who opens it sees this exact scenario' : 'Could not copy. Select the link manually.');
  };
  const onCopySummary = async () => {
    toast((await copyText(text)) ? 'Summary copied to clipboard' : 'Could not copy the summary');
  };

  return (
    <>
      <div className="share-bar row" style={{ gap: 8 }}>
        <Button variant="soft" size="sm" icon={<IconShare />} onClick={() => setOpen(true)}>
          Share result
        </Button>
        <Button variant="ghost" size="sm" icon={<IconLink />} onClick={onCopyLink}>
          Copy link
        </Button>
        <Button variant="ghost" size="sm" icon={<IconCopy />} onClick={onCopySummary}>
          Copy summary
        </Button>
        <Button variant="ghost" size="sm" icon={<IconPrint />} onClick={() => window.print()} className="hide-mobile">
          Print / PDF
        </Button>
      </div>
      <ShareModal open={open} onClose={() => setOpen(false)} calculatorName={calculatorName} scenarioName={scenarioName} summary={summary} url={url} text={text} />
    </>
  );
}

function ShareModal({ open, onClose, calculatorName, scenarioName, summary, url, text }: { open: boolean; onClose: () => void; calculatorName: string; scenarioName: string; summary: ShareSummary; url: string; text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (c) {
      const render = () => renderShareCard(c, { calculatorName, scenarioName, summary });
      render();
      // Re-render once web fonts are available so the card uses Inter instead of the fallback.
      if (typeof document !== 'undefined' && 'fonts' in document) {
        (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
          if (canvasRef.current === c) render();
        });
      }
    }
    setCanShareFiles(typeof navigator !== 'undefined' && 'canShare' in navigator && typeof navigator.share === 'function');
  }, [open, calculatorName, scenarioName, summary]);

  const download = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const blob = await canvasToBlob(c);
    if (!blob) return toast('Could not create the image');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `truecost-${calculatorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Image downloaded');
  }, [calculatorName, toast]);

  const nativeShare = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const blob = await canvasToBlob(c);
    if (!blob) return;
    const file = new File([blob], 'truecost-result.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: summary.headline, text: summary.headline, url });
      } else {
        await navigator.share({ title: summary.headline, text: summary.headline, url });
      }
    } catch {
      /* user cancelled */
    }
  }, [summary.headline, url]);

  const copyImage = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const blob = await canvasToBlob(c);
      if (!blob) throw new Error('no blob');
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem }).ClipboardItem;
      if (!ClipboardItemCtor) throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      toast('Image copied to clipboard');
    } catch {
      toast('Your browser cannot copy images — use Download instead');
    }
  }, [toast]);

  return (
    <Modal open={open} onClose={onClose} title="Share this result" icon={<IconShare />}>
      <div className="share-preview">
        <canvas ref={canvasRef} style={{ aspectRatio: '1200 / 630' }} aria-label="Preview of the shareable result card" role="img" />
      </div>
      <div className="share-actions">
        <Button variant="primary" icon={<IconDownload />} onClick={download}>
          Download image
        </Button>
        <Button icon={<IconCopy />} onClick={copyImage}>
          Copy image
        </Button>
        <Button
          icon={<IconLink />}
          onClick={async () => {
            toast((await copyText(url)) ? 'Link copied' : 'Could not copy');
          }}
        >
          Copy link
        </Button>
        {canShareFiles && (
          <Button icon={<IconShare />} onClick={nativeShare}>
            Share…
          </Button>
        )}
      </div>
      <div>
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="small" style={{ fontWeight: 600 }}>
            Text summary
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={<IconCopy />}
            onClick={async () => {
              toast((await copyText(text)) ? 'Summary copied' : 'Could not copy');
            }}
          >
            Copy
          </Button>
        </div>
        <pre className="summary-box">{text}</pre>
      </div>
      <p className="micro muted">The link encodes your inputs, so whoever opens it sees the same scenario and can edit every assumption. Nothing is uploaded or stored on a server.</p>
    </Modal>
  );
}
