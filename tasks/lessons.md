# Lecciones

## Revisar qué pasa alrededor de una función nueva (2026-11-06)
- **Error:** agregué el botón "Pagar" en la confirmación sin tener en cuenta que WhatsApp se abría solo al reservar y lo tapaba. Las pruebas no lo detectaron porque simulaban `window.open`.
- **Regla:** antes de sumar algo a una pantalla, recorrer el flujo completo como el usuario real y revisar qué se abre, redirige o tapa esa pantalla.
- **Prueba:** registrar las llamadas a `window.open` y comprobar el resultado, en vez de solo anularlas.

## Mirar las pantallas, no solo las pruebas (2026-11-06)
- **Error:** las pruebas del panel pasaban, pero las capturas mostraron una pestaña fuera de la pantalla y "Registrar pago" en negocios exentos, incluido el propio.
- **Regla:** después de una prueba en verde, abrir las capturas en tamaño celular y buscar acciones que no deberían estar disponibles.
- **Prueba:** para detectar desbordes en modo celular, medir la posición real del elemento (`getBoundingClientRect`). `scrollWidth` contra `innerWidth` no sirve porque el navegador agranda la pantalla virtual.
