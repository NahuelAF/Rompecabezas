# 💌 Puzzle Romántico — Guía de uso

## 📁 Estructura del proyecto

```
puzzle-romantico/
├── index.html
├── styles.css
├── script.js
└── assets/
    ├── img/
    │   └── collage.jpg      ← Tu foto/collage va acá
    └── audio/
        ├── music.mp3        ← Música de fondo (loop suave)
        └── pop.mp3          ← Sonido al colocar cada pieza
```

## 🚀 Cómo usarlo

1. **Copiá los tres archivos** (`index.html`, `styles.css`, `script.js`) en una carpeta.
2. **Creá la estructura** de `/assets/img/` y `/assets/audio/`.
3. **Agregá tu imagen** como `assets/img/collage.jpg`.
4. **Agregá los audios** (podés usar cualquier MP3 libre de derechos).
5. Abrí `index.html` en un servidor local (por ejemplo con la extensión Live Server de VS Code).

> ⚠️ No abras el HTML directamente con doble clic — los navegadores bloquean la carga de imágenes locales sin servidor. Usá un servidor local.

---

## ✏️ Personalización

### Cambiar la imagen
En `script.js`, línea 1, modificá:
```js
imgSrc: '/assets/img/collage.jpg',
```
Por la ruta de tu imagen.

### Cambiar el mensaje de la carta
En `script.js`, buscá `const LETTER_TEXT = ` y editá el texto libremente.

### Cambiar el mensaje final
En `index.html`, buscá:
```html
<p class="final-quote">
  Cada pieza tiene un pedacito<br/>de lo que siento por vos ❤️
</p>
```

### Cambiar colores
En `styles.css`, editá las variables CSS al inicio:
```css
:root {
  --rose-deep: #c0394b;
  --rose-mid:  #e05a6e;
  ...
}
```

---

## 📱 Compatibilidad
- ✅ iPhone (Safari)
- ✅ Android (Chrome)
- ✅ Desktop (Chrome, Firefox, Safari, Edge)

---

## 🎵 Dónde conseguir audios libres de derechos
- [Pixabay Music](https://pixabay.com/music/) — música ambiental/romantic
- [Freesound](https://freesound.org/) — efectos de sonido (buscá "soft pop" o "ding")
