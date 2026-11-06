# Lecciones

## Revisar qué pasa alrededor de una función nueva (2026-11-06)
- **Error:** agregué el botón "Pagar" en la confirmación sin tener en cuenta que WhatsApp se abría solo al reservar y lo tapaba. Las pruebas no lo detectaron porque simulaban `window.open`.
- **Regla:** antes de sumar algo a una pantalla, recorrer el flujo completo como el usuario real y revisar qué se abre, redirige o tapa esa pantalla.
- **Prueba:** registrar las llamadas a `window.open` y comprobar el resultado, en vez de solo anularlas.
