# Descripción del juego
Es un juego de supervivencia en primera persona ambientado en el Hospital San Lázaro. El jugador debe atravesar una zona infestada de zombis, administrar su munición y llegar a salvo a la zona de extracción verde antes de que lo atrapen. Se cuenta con dos armas y los zombis persiguen y buscan atacar al jugador.

+ Controles:
- W: Avanzar.
- A: Moverse a la izquierda.
- S: Retroceder.
- D: Moverse a la derecha.
- Mouse: Apuntar.
- Clic izquierdo: Disparar (un disparo por clic).
- 1 y 2: Cambiar de arma (Pistola / AK-74).
- R: Reiniciar partida.

+ Instrucciones de instalación y ejecución
Se utilizó Three.js para crear el escenario, los movimientos y las interacciones. Los modelos 3D y animaciones de armas y zombis se cargan mediante GLTFLoader en formato .glb.


# Servidor local con Python o npx
python -m http.server 8000
# o: npx serve .