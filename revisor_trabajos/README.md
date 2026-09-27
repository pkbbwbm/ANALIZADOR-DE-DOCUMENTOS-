# Revisor Académico

Aplicación web estática para revisar señales de naturalidad y claridad en trabajos académicos.

## Características

- PDF, DOCX y TXT.
- Funciona desde teléfono o computador.
- No requiere servidor para el análisis básico.
- El archivo se procesa localmente en el navegador.
- Indicador de naturalidad de escritura.
- Revisión de repeticiones, frases genéricas y oraciones extensas.
- Recomendaciones para que el estudiante revise y desarrolle sus propias ideas.

## Importante

El indicador NO es un detector científico de IA y no determina qué porcentaje del documento fue generado por inteligencia artificial. Tampoco está conectado con sistemas de universidades ni con plataformas de evaluación.

## Subir a GitHub

1. Crea un repositorio nuevo.
2. Sube `index.html`, `style.css`, `app.js` y `README.md`.
3. En GitHub entra a **Settings > Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y carpeta `/ (root)`.
6. Guarda.
7. GitHub te mostrará la dirección de tu página.

## Limitación de PDF escaneado

Si el PDF contiene únicamente imágenes escaneadas, no habrá texto que analizar. En ese caso se puede añadir OCR como una segunda versión.

## Privacidad

La aplicación no incluye un backend. El documento se procesa en el navegador del usuario y no se almacena en una base de datos.
