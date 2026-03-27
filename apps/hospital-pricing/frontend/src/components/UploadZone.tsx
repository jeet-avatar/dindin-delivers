import { useRef, useState, DragEvent, ChangeEvent } from 'react'

interface Props {
  accept?: string
  maxMB?: number
  onFile: (file: File) => void
  uploading?: boolean
  progress?: number
  error?: string
}

export function UploadZone({
  accept = '.pdf',
  maxMB = 50,
  onFile,
  uploading = false,
  progress,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (file.size > maxMB * 1024 * 1024) {
      setSizeError(`File exceeds ${maxMB}MB limit`)
      return
    }
    setSizeError(null)
    onFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const displayError = error ?? sizeError

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-navy bg-blue-50' : 'border-slate-300 hover:border-navy hover:bg-slate-50'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="text-3xl mb-2">📄</div>
        <p className="text-sm text-slate-600 font-medium">
          {uploading ? 'Uploading…' : 'Drop file here or click to browse'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {accept.toUpperCase().replace('.', '')} · max {maxMB}MB
        </p>
        {uploading && typeof progress === 'number' && (
          <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />
      {displayError && (
        <p className="text-xs text-red-600">{displayError}</p>
      )}
    </div>
  )
}
