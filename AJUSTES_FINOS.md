# Guía de Ajustes Finos - ConsonAr_Front

## ⚙️ Parámetros Configurables

Si necesitas afinar la detección después de probar, aquí están los parámetros clave en `src/audio/audioFileAnalyzer.ts`:

### 1. Sensibilidad de Detección

**Archivo**: `audioFileAnalyzer.ts` línea 42

```typescript
const detectPitch = YIN_typed({
  sampleRate,
  minFrequency: 50,      // ← Frecuencia mínima (Hz)
  maxFrequency: 2000,    // ← Frecuencia máxima (Hz)
  threshold: 0.05,       // ← Threshold YIN (menor = más sensible)
});
```

**Ajustes Recomendados**:
- Si detecta muchas notas falsas → Aumentar `threshold` a 0.06-0.08
- Si pierde notas bajas → Reducir `minFrequency` a 40
- Si pierde notas altas → Aumentar `maxFrequency` a 2500

### 2. Estabilidad de Notas

**Archivo**: `audioFileAnalyzer.ts` línea 133

```typescript
if (stableCount >= 2) {  // ← Mínimo de frames estables
  rawNotes.push({ ... });
}
```

**Ajustes Recomendados**:
- Si detecta mucho ruido → Cambiar a `stableCount >= 3`
- Si pierde notas cortas → Cambiar a `stableCount >= 1`

### 3. Agrupamiento de Notas

**Archivo**: `audioFileAnalyzer.ts` líneas 125-126

```typescript
if (r.note !== grp.note || gap > 100) {  // ← Gap máximo (ms)
  const dur = grp.end - grp.start;
  if (dur >= 40) {  // ← Duración mínima (ms)
```

**Ajustes Recomendados**:
- Notas legato conectadas → Aumentar `gap` a 150ms
- Detectar staccato bien → Reducir `gap` a 80ms
- Notas muy cortas → Reducir duración mínima a 20ms

### 4. Visualización

**Archivo**: `src/components/audio/SheetMusic.tsx` línea 24

```typescript
const maxN = 60;  // ← Máximo de notas mostradas visibles
```

**Ajustes Recomendados**:
- Menos notas por pantalla → Reducir a 30-40
- Más detalle → Aumentar a 80-100 (más ancho)

---

## 🎯 Perfiles de Ajuste

### Para Voces (Mayor Rango Dinámico)
```typescript
threshold: 0.06,        // Menos sensible a ruido
minFrequency: 80,       // Evita ruido muy bajo
stableCount: 3,         // Más estabilidad requerida
```

### Para Instrumentos de Viento
```typescript
threshold: 0.04,        // Muy sensible
minFrequency: 40,       // Captura toda la gama
gap: 50ms,             // Conexión rápida
```

### Para Guitarra/Bajo
```typescript
minFrequency: 40,
maxFrequency: 1500,
stableCount: 2,
gap: 100ms
```

---

## 📊 Diagnóstico

Si algo no funciona como esperaba, revisa la consola (F12 → Console):

```
AudioAnalyzer: 5420 frames → 150 grupos → 120 notas
        ↓              ↓                ↓
   Frames detectados  Agrupados    Resultado final
```

**Si los números son**:
- Frames muy bajos (< 500) → Audio muy silencioso
- Frames altos pero grupos pocos → Threshold demasiado alto
- Grupos altos pero notas pocas → Duración mínima demasiado alta

---

## 🐛 Problemas Comunes

### Problema: Detecta muchas octavas incorrectas
**Solución**: Aumentar `threshold` de 0.05 a 0.07

### Problema: Pierde notas rápidas
**Solución**: Cambiar `stableCount >= 2` a `stableCount >= 1`

### Problema: Carga muy lenta
**Solución**: 
1. Reducir `maxN` de 60 a 40 en SheetMusic.tsx
2. Aumentar `maxNotes` de 500 a 200 en audioFileAnalyzer.ts

### Problema: Números de trastes no se ven
**Solución**: Ya está parcialmente arreglado, pero si persiste:
```typescript
// En SheetMusic.tsx línea 115
r.setAttribute('fill', 'rgba(255,255,255,0.01)');  // Reducir opacidad
```

---

## ✨ Tips de Optimización

1. **Archivos en MP3**: Comprime la calidad, mejor con WAV
2. **Duración**: Archivos < 60 segundos procesan mejor
3. **Volumen**: Normalizar audio a -3dB antes de subir
4. **Formato**: WAV 44.1kHz es optimal para detección

---

## 📞 Soporte

Todos los parámetros están comentados en el código:
- `audioFileAnalyzer.ts` - Lógica de detección
- `SheetMusic.tsx` - Renderizado visual
- `instruments.ts` - Configuración de instrumentos
