# run-bat-lanzador
Agrega `run.bat` en la raíz: levanta BD+Redis (`docker compose up -d --wait`), API (`npm run dev:api`) y Web (`npm run dev:web`) cada uno en su ventana, y abre http://localhost:3012. No existe lanzador equivalente: `botmef-saas.bat dev` (CERO.ps1) corre build y un solo `npm run dev` en una ventana, sin navegador, por eso `run.bat` no lo llama.
Nunca destructivo (sin `down -v`, seeds ni reset). `pause` solo ante error. Si el puerto de la BD (5438) está ocupado por algo ajeno, lo dice y no mata nada.
