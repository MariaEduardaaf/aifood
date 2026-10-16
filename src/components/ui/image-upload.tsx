'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
}: ImageUploadProps) {
  const t = useTranslations('imageUpload')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || t('uploadFailed'))
        }

        const data = await response.json()
        onChange(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('uploadFailed'))
      } finally {
        setIsUploading(false)
      }
    },
    [onChange, t]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleUpload(file)
    } else {
      setError(t('invalidImage'))
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    } else {
      onChange('')
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  if (value) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-provided URL of arbitrary origin, with onError fallback */}
        <img
          src={value}
          alt={t("preview")}
          className="w-full h-48 object-cover rounded-lg border border-border"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.png'
          }}
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          aria-label={t('remove')}
          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer
          transition-colors flex flex-col items-center justify-center
          min-h-[180px]
          ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">{t('uploading')}</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {t('clickToUpload')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dragAndDrop')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('allowedFormats')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}
