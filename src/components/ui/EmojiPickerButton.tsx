'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'

const EMOJIS_SUGERIDOS = [
  '🙂', '😊', '👍', '👎', '✅', '❌', '📞', '💬', '✉️',
  '📅', '⏰', '🔥', '⭐', '⚠️', '🚨', '📝', '💰', '🤝', '🏢',
]

interface Props {
  value: string
  onChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
}

// Inserta un emoji en la posicion del cursor de un textarea controlado,
// sin depender de librerias externas.
export default function EmojiPickerButton({ value, onChange, textareaRef }: Props) {
  const [abierto, setAbierto] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const cerrarSiFueraDelPanel = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiFueraDelPanel)
    return () => document.removeEventListener('mousedown', cerrarSiFueraDelPanel)
  }, [abierto])

  const insertarEmoji = (emoji: string) => {
    const el = textareaRef.current
    const inicio = el?.selectionStart ?? value.length
    const fin = el?.selectionEnd ?? value.length
    const nuevoValor = value.slice(0, inicio) + emoji + value.slice(fin)
    onChange(nuevoValor)
    setAbierto(false)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      const posicion = inicio + emoji.length
      el.setSelectionRange(posicion, posicion)
    })
  }

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        title="Insertar emoji"
        aria-label="Insertar emoji"
        className="text-sm w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition leading-none"
      >
        🙂
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-7 gap-0.5 w-60">
          {EMOJIS_SUGERIDOS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertarEmoji(emoji)}
              className="text-base w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
