"use client"

import { useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Volume2, ImageIcon, Plus, Trash2, Upload, AlignLeft, Search,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActivityOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface SequenceStep {
  file: File | null
  previewUrl: string
  existingUrl: string
  description: string
  preguntaId?: string
}

export interface ActivityConfigFormProps {
  type: string

  // Image
  imagePreviewUrl: string
  existingImageUrl: string
  imageInputRef: React.RefObject<HTMLInputElement | null>
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImageDelete: () => void

  // Instructions
  instrucciones: string
  onInstruccionesChange: (v: string) => void

  // Options (image / multiple)
  options: ActivityOption[]
  onOptionTextChange: (id: string, text: string) => void
  onSetCorrect: (id: string) => void
  onAddOption: () => void
  onRemoveOption: (id: string) => void

  // Correct answer (short / sound / voice)
  correctAnswer: string
  onCorrectAnswerChange: (v: string) => void

  // Difficulty
  dificultad: string
  onDificultadChange: (v: string) => void

  // Sound / Fill distractors
  palabrasDistractoras: string
  onPalabrasDistractorasChange: (v: string) => void

  // Voice
  voiceEnunciado: string
  onVoiceEnunciadoChange: (v: string) => void

  // Fill
  fillEnunciado: string
  onFillEnunciadoChange: (v: string) => void
  fillContextSentences: string[]
  onFillContextSentencesChange: (sentences: string[]) => void

  // Wordsearch
  wsWords: string[]
  wsInput: string
  onWsInputChange: (v: string) => void
  onAddWsWord: () => void
  onRemoveWsWord: (word: string) => void

  // Sequence
  sequenceCount: 3 | 4 | 5
  onSequenceCountChange: (n: 3 | 4 | 5) => void
  sequenceSteps: SequenceStep[]
  onSequenceStepsChange: (steps: SequenceStep[]) => void
  seqInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>

  // TTS
  speak: (text: string) => void

  // Validación al guardar
  showValidation?: boolean
}

const difficultyLevels = [
  { id: "facil",   label: "Fácil",   description: "Para comenzar" },
  { id: "medio",   label: "Medio",   description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityConfigForm({
  type,
  imagePreviewUrl, existingImageUrl, imageInputRef, onImageSelect, onImageDelete,
  instrucciones, onInstruccionesChange,
  options, onOptionTextChange, onSetCorrect, onAddOption, onRemoveOption,
  correctAnswer, onCorrectAnswerChange,
  dificultad, onDificultadChange,
  palabrasDistractoras, onPalabrasDistractorasChange,
  voiceEnunciado, onVoiceEnunciadoChange,
  fillEnunciado, onFillEnunciadoChange,
  fillContextSentences, onFillContextSentencesChange,
  wsWords, wsInput, onWsInputChange, onAddWsWord, onRemoveWsWord,
  sequenceCount, onSequenceCountChange, sequenceSteps, onSequenceStepsChange, seqInputRefs,
  speak,
  showValidation = false,
}: ActivityConfigFormProps) {

  const showImage    = type === "image"
  const showOptions  = type === "image" || type === "multiple"
  const showSound    = type === "sound"
  const showVoice    = type === "voice"
  const showFill     = type === "fill"
  const showSequence = type === "sequence"
  const showShort    = type === "short"
  const showWs       = type === "wordsearch"

  const instrRequired = !showSound && !showVoice && !showFill && !showSequence && !showWs

  return (
    <div className="space-y-5">

      {/* ── Imagen de la Actividad ─────────────────────────────────── */}
      {showImage && (
        <section aria-labelledby="img-act-titulo" className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
          <div>
            <h2 id="img-act-titulo" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              Imagen de la Actividad
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sube la imagen que el estudiante verá para identificar. Formatos: JPG, PNG, WebP · Máx 5 MB.
            </p>
          </div>

          {(imagePreviewUrl || existingImageUrl) ? (
            <div>
              <img
                src={imagePreviewUrl || existingImageUrl}
                alt="Vista previa de la imagen subida"
                className="w-full max-h-56 object-contain rounded-xl border border-border bg-muted"
              />
              <div className="flex gap-2 mt-3">
                <button type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  Cambiar imagen
                </button>
                <button type="button"
                  onClick={onImageDelete}
                  aria-label="Eliminar imagen"
                  className="flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-40 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors">
              <ImageIcon className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Haz clic para subir una imagen</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Máx 5 MB</p>
            </button>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onImageSelect}
          />
        </section>
      )}

      {/* ── Reconocimiento de Sonidos ──────────────────────────────── */}
      {showSound && (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Oración Correcta</h2>
            <div className="flex gap-2">
              <Input
                value={correctAnswer}
                onChange={(e) => onCorrectAnswerChange(e.target.value)}
                aria-label="Oración correcta"
                placeholder="Ej: Los gatos son bonitos"
                className="border-border flex-1"
              />
              <button type="button"
                onClick={() => correctAnswer.trim() && speak(correctAnswer.trim())}
                disabled={!correctAnswer.trim()}
                aria-label="Escuchar oración"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 shrink-0 transition-all">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                Escuchar
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              El sistema reproducirá esta oración en voz alta al alumno usando el sintetizador de voz del navegador.
            </p>
            {correctAnswer.trim() && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                {correctAnswer.trim().split(/\s+/).map((word, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{word}</span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Palabras Distractoras{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </h2>
            <Input
              value={palabrasDistractoras}
              onChange={(e) => onPalabrasDistractorasChange(e.target.value)}
              aria-label="Palabras distractoras separadas por comas"
              placeholder="Ej: nube, famoso, mesa"
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">
              Separa las palabras con <strong>comas</strong>. Se mezclarán con la oración para aumentar la dificultad.
            </p>
            {palabrasDistractoras.trim() && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                {palabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                  <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">{word.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Respuesta por Voz ──────────────────────────────────────── */}
      {showVoice && (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Pregunta</h2>
            <div className="flex gap-2">
              <Input
                value={voiceEnunciado}
                onChange={(e) => onVoiceEnunciadoChange(e.target.value)}
                aria-label="Pregunta de la actividad"
                placeholder="Ej: ¿De qué color es el cielo?"
                className="border-border flex-1"
              />
              <button type="button"
                onClick={() => voiceEnunciado.trim() && speak(voiceEnunciado.trim())}
                disabled={!voiceEnunciado.trim()}
                aria-label="Escuchar pregunta"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 shrink-0 transition-all">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                Escuchar
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Esta pregunta se mostrará y se leerá en voz alta al alumno.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Respuesta Correcta</h2>
            <Input
              value={correctAnswer}
              onChange={(e) => onCorrectAnswerChange(e.target.value)}
              aria-label="Respuestas correctas separadas por comas"
              placeholder="Ej: azul, celeste, azul claro"
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">
              Separa con <strong>comas</strong> si hay varias respuestas válidas. Se acepta cualquiera.
            </p>
            {correctAnswer.trim() && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                {correctAnswer.split(",").filter(s => s.trim()).map((ans, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{ans.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Ordenar Secuencias ─────────────────────────────────────── */}
      {showSequence && (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 id="seq-count-label" className="text-sm font-semibold text-foreground mb-3">¿Cuántas imágenes?</h2>
            <div role="group" aria-labelledby="seq-count-label" className="grid grid-cols-3 gap-3">
              {([3, 4, 5] as const).map((n) => (
                <button key={n} type="button"
                  onClick={() => {
                    onSequenceCountChange(n)
                    const cur = [...sequenceSteps]
                    while (cur.length < n) cur.push({ file: null, previewUrl: "", existingUrl: "", description: "" })
                    onSequenceStepsChange(cur.slice(0, n))
                  }}
                  aria-pressed={sequenceCount === n}
                  className={`rounded-xl border py-3 text-center transition-all active:scale-[0.98] ${sequenceCount === n
                    ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                    : "border-border hover:border-primary/40 hover:bg-muted"}`}>
                  <span className={`text-2xl font-bold block ${sequenceCount === n ? "text-primary" : "text-foreground"}`}>{n}</span>
                  <span className="text-xs text-muted-foreground">imágenes</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Imágenes de la secuencia</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Sube las imágenes <strong>en el orden correcto</strong>. El alumno deberá reordenarlas.
              </p>
            </div>
            {sequenceSteps.map((step, idx) => (
              <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">Paso {idx + 1}</h3>
                </div>

                {(step.previewUrl || step.existingUrl) ? (
                  <div className="space-y-2">
                    <img
                      src={step.previewUrl || step.existingUrl}
                      alt={`Paso ${idx + 1}`}
                      className="w-full max-h-40 object-contain rounded-xl border border-border bg-muted"
                    />
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => seqInputRefs.current[idx]?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        Cambiar
                      </button>
                      <button type="button"
                        aria-label={`Eliminar imagen del paso ${idx + 1}`}
                        onClick={() => {
                          const steps = [...sequenceSteps]
                          if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                          steps[idx] = { ...steps[idx], file: null, previewUrl: "", existingUrl: "" }
                          onSequenceStepsChange(steps)
                        }}
                        className="flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => seqInputRefs.current[idx]?.click()}
                    className="w-full h-32 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors">
                    <ImageIcon className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground font-medium">Subir imagen del paso {idx + 1}</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Máx 5 MB</p>
                  </button>
                )}

                <input
                  ref={(el) => { seqInputRefs.current[idx] = el }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const steps = [...sequenceSteps]
                    if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                    steps[idx] = { ...steps[idx], file, previewUrl: URL.createObjectURL(file) }
                    onSequenceStepsChange(steps)
                    e.target.value = ""
                  }}
                />

                <Input
                  value={step.description}
                  onChange={(e) => {
                    const steps = [...sequenceSteps]
                    steps[idx] = { ...steps[idx], description: e.target.value }
                    onSequenceStepsChange(steps)
                  }}
                  aria-label={`Descripción del paso ${idx + 1}`}
                  placeholder={`Descripción del paso ${idx + 1} (opcional)`}
                  className="border-border"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Completar Oración ──────────────────────────────────────── */}
      {showFill && (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Oraciones de Contexto{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </h2>
            {fillContextSentences.map((sentence, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={sentence}
                  onChange={(e) => {
                    const next = [...fillContextSentences]
                    next[idx] = e.target.value
                    onFillContextSentencesChange(next)
                  }}
                  aria-label={`Oración de contexto ${idx + 1}`}
                  placeholder="Ej: Yo tengo tres mascotas."
                  className="border-border flex-1"
                />
                <button type="button"
                  aria-label="Eliminar oración"
                  disabled={fillContextSentences.length === 1 && !sentence.trim()}
                  onClick={() => {
                    if (fillContextSentences.length > 1) {
                      onFillContextSentencesChange(fillContextSentences.filter((_, i) => i !== idx))
                    } else {
                      onFillContextSentencesChange([""])
                    }
                  }}
                  className="flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-destructive hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50 shrink-0 transition-all">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => onFillContextSentencesChange([...fillContextSentences, ""])}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-muted active:scale-[0.98] transition-all">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar oración de ejemplo
            </button>
            <p className="text-xs text-muted-foreground">
              Estas oraciones aparecen como ejemplos para que el alumno comprenda el patrón antes de completar.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Oración a Completar</h2>
            <Input
              value={fillEnunciado}
              onChange={(e) => onFillEnunciadoChange(e.target.value)}
              aria-label="Oración a completar con espacio en blanco"
              placeholder="Ej: Yo tengo tres ___."
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">
              Usa <strong>___</strong> (tres guiones bajos) para marcar el espacio en blanco.
            </p>
            {fillEnunciado.includes("___") && (
              <div className="p-3 bg-muted rounded-xl text-sm font-medium text-foreground">
                Vista previa:{" "}
                {fillEnunciado.split("___").map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < fillEnunciado.split("___").length - 1 && (
                      <span className="inline-block min-w-[60px] mx-1 border-b-2 border-dashed border-primary text-primary">
                        {correctAnswer.trim() || "___"}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Respuesta Correcta</h2>
            <Input
              value={correctAnswer}
              onChange={(e) => onCorrectAnswerChange(e.target.value)}
              aria-label="Palabra correcta para completar el espacio"
              placeholder="Ej: gatos"
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">La palabra exacta que completa el espacio en blanco.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Palabras Distractoras{" "}
              <span className="text-muted-foreground font-normal">(opciones incorrectas)</span>
            </h2>
            <Input
              value={palabrasDistractoras}
              onChange={(e) => onPalabrasDistractorasChange(e.target.value)}
              aria-label="Palabras distractoras separadas por comas"
              placeholder="Ej: gato, perros, pez"
              className="border-border"
            />
            <p className="text-xs text-muted-foreground">
              Separa con <strong>comas</strong>. Se mezclarán con la respuesta correcta como opciones.
            </p>
            {palabrasDistractoras.trim() && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                {palabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                  <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">{word.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Sopa de Letras ────────────────────────────────────────── */}
      {showWs && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" aria-hidden="true" />
            Palabras a Encontrar
          </h2>
          <p className="text-xs text-muted-foreground">
            Agrega las palabras que los estudiantes deben encontrar. Se convertirán a mayúsculas automáticamente. Máximo 10 palabras.
          </p>
          <div className="flex gap-2">
            <Input
              value={wsInput}
              onChange={(e) => onWsInputChange(e.target.value)}
              aria-label="Palabra para agregar a la sopa de letras"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); onAddWsWord() }
              }}
              placeholder="Ej: GATO"
              className="border-border flex-1"
              maxLength={15}
            />
            <button type="button"
              onClick={onAddWsWord}
              disabled={wsWords.length >= 10 || !wsInput.trim()}
              aria-label="Agregar palabra"
              className="flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          {wsWords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wsWords.map(word => (
                <span key={word} className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/30 text-sm">
                  {word}
                  <button type="button"
                    onClick={() => onRemoveWsWord(word)}
                    aria-label={`Eliminar ${word}`}
                    className="text-primary hover:text-destructive transition-colors">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {wsWords.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Agrega al menos una palabra.</p>
          )}
        </div>
      )}

      {/* ── Instrucciones de la Actividad ─────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <label htmlFor="act-instrucciones" className="text-sm font-semibold text-foreground mb-3 block">
          Instrucciones de la Actividad
        </label>
        <textarea
          id="act-instrucciones"
          value={instrucciones}
          onChange={(e) => onInstruccionesChange(e.target.value)}
          placeholder="Escribe instrucciones claras y simples. Ejemplo: Mira la imagen y selecciona el animal que ves."
          className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          required={instrRequired}
          maxLength={150}
        />
        {(() => {
          const len = instrucciones.length
          const color = len > 80 ? "text-destructive" : "text-muted-foreground"
          const msg   = len <= 50 ? "Instrucción clara" : len <= 80 ? "Aceptable" : "Considera simplificar"
          return (
            <p className={`text-xs mt-1.5 text-right ${color}`} aria-live="polite">
              {len} / 150 · {msg}
            </p>
          )
        })()}
      </div>

      {/* ── Opciones de Respuesta (imagen / opción múltiple) ─────── */}
      {showOptions && (
        <fieldset className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <legend className="text-sm font-semibold text-foreground px-1">Opciones de Respuesta</legend>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {options.length} / 4 opciones
            </span>
          </div>
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-3">
              <button type="button"
                onClick={() => onSetCorrect(option.id)}
                aria-pressed={option.isCorrect}
                aria-label={option.isCorrect
                  ? `Opción ${index + 1} marcada como correcta`
                  : `Marcar opción ${index + 1} como correcta`}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all text-sm font-bold ${option.isCorrect
                  ? "bg-success border-success text-success-foreground"
                  : "border-border hover:border-primary"}`}>
                {option.isCorrect ? "✓" : String.fromCharCode(65 + index)}
              </button>
              <Input
                value={option.text}
                onChange={(e) => onOptionTextChange(option.id, e.target.value)}
                aria-label={`Texto de opción ${index + 1}${option.isCorrect ? " (correcta)" : ""}`}
                placeholder={`Opción ${index + 1}`}
                className="border-border flex-1"
              />
              {options.length > 2 && (
                <button type="button"
                  onClick={() => onRemoveOption(option.id)}
                  aria-label={`Eliminar opción ${index + 1}`}
                  className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button type="button"
              onClick={onAddOption}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-muted active:scale-[0.98] transition-all">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Opción
            </button>
          )}
          {showValidation && !options.some(o => o.isCorrect) && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2" role="alert">
              Debes marcar una opción como la respuesta correcta antes de guardar.
            </p>
          )}
        </fieldset>
      )}

      {/* ── Respuesta Corta ───────────────────────────────────────── */}
      {showShort && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Respuesta Correcta</h2>
          <Input
            value={correctAnswer}
            onChange={(e) => onCorrectAnswerChange(e.target.value)}
            aria-label="Respuesta correcta esperada"
            placeholder="Escribe la respuesta esperada"
            className="border-border"
          />
          <p className="text-xs text-muted-foreground">
            El sistema comparará la respuesta del estudiante con esta.
          </p>
        </div>
      )}

      {/* ── Nivel de Dificultad ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <h2 id="dificultad-label" className="text-sm font-semibold text-foreground mb-3">Nivel de Dificultad</h2>
        <div role="group" aria-labelledby="dificultad-label" className="grid grid-cols-3 gap-3">
          {difficultyLevels.map((level) => (
            <button key={level.id} type="button"
              onClick={() => onDificultadChange(level.id)}
              aria-pressed={dificultad === level.id}
              className={`rounded-xl border px-3 py-3 text-center transition-all active:scale-[0.98] ${dificultad === level.id
                ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                : "border-border hover:border-primary/40 hover:bg-muted"}`}>
              <p className={`text-sm font-bold ${dificultad === level.id ? "text-primary" : "text-foreground"}`}>
                {level.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
