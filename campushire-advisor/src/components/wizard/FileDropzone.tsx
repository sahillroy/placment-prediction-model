import { useRef, useState } from 'react'

interface FileDropzoneProps {
    file: File | null
    onFileChange: (file: File | null) => void
    error?: string
}

const MAX_SIZE_MB = 5
const ACCEPTED_TYPE = 'application/pdf'

export function FileDropzone({ file, onFileChange, error }: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    function validate(f: File): string | null {
        if (f.type !== ACCEPTED_TYPE) return 'Only PDF files are accepted.'
        if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File too large. Max size is ${MAX_SIZE_MB} MB.`
        return null
    }

    function handleFile(f: File) {
        const err = validate(f)
        if (err) { setLocalError(err); return }
        setLocalError(null)
        onFileChange(f)
    }

    const displayError = error ?? localError

    return (
        <div>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const f = e.dataTransfer.files[0]
                    if (f) handleFile(f)
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${isDragging
                        ? 'border-indigo-400 bg-indigo-50'
                        : displayError
                            ? 'border-red-400 bg-red-50'
                            : file
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">✅</span>
                        <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onFileChange(null) }}
                            className="text-xs text-red-500 hover:underline mt-1"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl text-slate-400">📄</span>
                        <p className="text-sm font-medium text-slate-700">
                            Drop your PDF resume here or click to browse
                        </p>
                        <p className="text-xs text-slate-400">PDF only · Max {MAX_SIZE_MB} MB</p>
                    </div>
                )}
            </div>
            {displayError && <p className="mt-2 text-xs text-red-500">{displayError}</p>}
        </div>
    )
}
