import { useRef } from 'react';
import { Button } from './Button';

type Props = {
  label: string;
  buttonLabel: string;
  accept?: string;
  disabled?: boolean;
  fileName?: string;
  onFileSelect: (file: File) => void;
};

export function FileUploadControl({ label, buttonLabel, accept, disabled, fileName, onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className="ui-file-upload"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelect(file);
      }}
    >
      <div className="ui-file-upload-top">
        <span className="ui-file-upload-label">{label}</span>
        <Button size="small" onClick={() => inputRef.current?.click()} disabled={disabled}>
          {buttonLabel}
        </Button>
      </div>
      <p className="ui-file-upload-name">{fileName || '-'}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="ui-file-upload-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
