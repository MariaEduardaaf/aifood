'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

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
          throw new Error(data.error || 'Erro ao fazer upload')
        }

        const data = await response.json()
        onChange(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
      } finally {
        setIsUploading(false)
      }
    },
    [onChange]
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
      setError('Por favor, selecione uma imagem válida')
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
        <img
          src={value}
          alt="Preview"
          className="w-full h-48 object-cover rounded-lg border border-gray-200"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.png'
          }}
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
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
          ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}
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
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Fazendo upload...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-orange-100 rounded-full mb-3">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Clique para fazer upload
            </p>
            <p className="text-xs text-gray-500">
              ou arraste e solte uma imagem aqui
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPEG, PNG, WebP ou GIF (máx. 5MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}
