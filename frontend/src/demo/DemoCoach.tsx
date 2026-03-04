import { useEffect } from 'react';
import { Button } from '../shared/ui/Button';
import './demo.css';

type Props = {
  title: string;
  description: string;
  step: number;
  total: number;
  selector?: string;
  busy?: boolean;
  auto?: boolean;
  paused?: boolean;
  statusText?: string;
  hidden?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onTogglePause?: () => void;
  onSkip: () => void;
};

export function DemoCoach({
  title,
  description,
  step,
  total,
  selector,
  busy,
  auto,
  paused,
  statusText,
  hidden,
  onPrev,
  onNext,
  onTogglePause,
  onSkip,
}: Props) {
  useEffect(() => {
    const node = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
    if (!node) return;
    node.classList.add('demo-target-active');
    node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    return () => node.classList.remove('demo-target-active');
  }, [selector, step]);

  return (
    <div className={`demo-coach ${hidden ? 'is-hidden' : ''}`}>
      <div className="demo-coach-title">{title}</div>
      <div className="demo-coach-step">
        Шаг {step + 1} / {total}
      </div>
      <p className="demo-coach-text">{description}</p>
      {statusText ? <div className="demo-coach-step">{statusText}</div> : null}
      <div className="demo-coach-actions">
        {onPrev ? (
          <Button variant="secondary" size="small" disabled={busy} onClick={onPrev}>
            Назад
          </Button>
        ) : null}
        {auto && onTogglePause ? (
          <Button variant="secondary" size="small" disabled={busy} onClick={onTogglePause}>
            {paused ? 'Продолжить' : 'Пауза'}
          </Button>
        ) : null}
        <Button variant="ghost" size="small" disabled={busy} onClick={onSkip}>
          Завершить демо
        </Button>
        {onNext ? (
          <Button variant="primary" size="small" disabled={busy} onClick={onNext}>
            Далее
          </Button>
        ) : null}
      </div>
    </div>
  );
}
