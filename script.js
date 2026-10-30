/* ==========================================================================
   CONFIGURACIÓN Y ESTADOS GLOBAL
   ========================================================================== */
let pressure = 32; // 0 a 1000 PSI
const MAX_PRESSURE = 150;
let isCharging = false;
let chargeInterval = null;
let depressureInterval = null;

// Referencias al DOM
const terminalOverlay = document.getElementById('terminal-overlay');
const btnStart = document.getElementById('btn-start');
const mainDossier = document.getElementById('main-dossier');

// Switches y LEDs
const switch1 = document.getElementById('switch-1');
const switch2 = document.getElementById('switch-2');
const switch3 = document.getElementById('switch-3');
const led1 = document.getElementById('led-1');
const led2 = document.getElementById('led-2');
const led3 = document.getElementById('led-3');

// Manómetro y Detonador
const pressureBar = document.getElementById('pressure-bar');
const pressureReadout = document.getElementById('pressure-readout');
const gaugeStatus = document.getElementById('gauge-status');
const btnCharge = document.getElementById('btn-charge');

// Elementos SVG
const spines = [
  document.getElementById('spine-1'),
  document.getElementById('spine-2'),
  document.getElementById('spine-3'),
  document.getElementById('spine-4'),
  document.getElementById('spine-5')
];
const atomicBreath = document.getElementById('atomic-breath');

// Efectos y Carta
const flashbang = document.getElementById('flashbang');
const birthdayCard = document.getElementById('birthday-card');
const btnReplay = document.getElementById('btn-replay');
const particlesContainer = document.getElementById('particles-container');

/* ==========================================================================
   WEB AUDIO API: SINTETIZADOR DE AUDIO TÁCTICO
   ========================================================================== */
let audioCtx = null;
let pressureOsc = null;
let pressureGain = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Clic metálico al accionar palancas
function playSwitchSound() {
  initAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

// Sonido continuo de turbina para presurización (Hold to Charge)
function startPressureAudio() {
  initAudioContext();
  if (!audioCtx || pressureOsc) return;

  const now = audioCtx.currentTime;
  pressureOsc = audioCtx.createOscillator();
  pressureGain = audioCtx.createGain();

  pressureOsc.type = 'sawtooth';
  pressureOsc.frequency.setValueAtTime(80, now);

  pressureGain.gain.setValueAtTime(0.01, now);
  pressureGain.gain.linearRampToValueAtTime(0.15, now + 0.1);

  pressureOsc.connect(pressureGain);
  pressureGain.connect(audioCtx.destination);

  pressureOsc.start(now);
}

function updatePressureAudio(psi) {
  if (!pressureOsc || !audioCtx) return;
  const now = audioCtx.currentTime;
  // Subida de tono según la presión de 0 a 100 PSI (de 80Hz a 450Hz)
  const targetFreq = 80 + (psi * 3.7);
  pressureOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
}

function stopPressureAudio() {
  if (pressureGain && audioCtx) {
    const now = audioCtx.currentTime;
    pressureGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    setTimeout(() => {
      if (pressureOsc) {
        pressureOsc.stop();
        pressureOsc.disconnect();
        pressureOsc = null;
        pressureGain = null;
      }
    }, 150);
  }
}

// Audio de explosión / rugido atómico
function playRoarSound() {
  initAudioContext();
  
  const audio = new Audio('roar.mp3');
  const playPromise = audio.play();

  if (playPromise !== undefined) {
    playPromise.catch(() => {
      synthesizeFallbackRumble();
    });
  }
}

function synthesizeFallbackRumble() {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 2.0);

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 2.2);
}

/* ==========================================================================
   FASE 1: TRANSICIÓN INICIAL
   ========================================================================== */
btnStart.addEventListener('click', () => {
  initAudioContext();
  playSwitchSound();

  terminalOverlay.style.transition = 'opacity 0.5s ease';
  terminalOverlay.style.opacity = '0';

  setTimeout(() => {
    terminalOverlay.classList.add('hidden');
    mainDossier.classList.remove('hidden');
  }, 500);
});

/* ==========================================================================
   MECÁNICA 1: PALANCAS MECÁNICAS DE SEGURIDAD
   ========================================================================== */
function checkFailsafes() {
  playSwitchSound();

  // Actualizar LEDs individuales (la temática ahora es vulnerar la contención)
  updateLed(switch1, led1);
  updateLed(switch2, led2);
  updateLed(switch3, led3);

  // Si las 3 palancas se accionan (desactivando la seguridad)
  if (switch1.checked && switch2.checked && switch3.checked) {
    btnCharge.disabled = false;
    gaugeStatus.textContent = "SISTEMAS VULNERADOS // MANTÉN PRESIONADO PARA SOBRECARGAR";
    gaugeStatus.classList.add('ready');
  } else {
    btnCharge.disabled = true;
    gaugeStatus.textContent = "ACCESO DENEGADO // DESACTIVA TODOS LOS SISTEMAS";
    gaugeStatus.classList.remove('ready');
    stopCharging();
  }
}

function updateLed(switchEl, ledEl) {
  // Si la palanca se enciende, significa que el sistema de seguridad fue desactivado
  if (switchEl.checked) {
    ledEl.textContent = "DESACTIVADA";
    ledEl.classList.remove('green');
    ledEl.classList.add('red');
  } else {
    // Estado inicial: los sistemas de contención bloquean el paso
    ledEl.textContent = "ACTIVADA";
    ledEl.classList.remove('red');
    ledEl.classList.add('green');
  }
}

switch1.addEventListener('change', checkFailsafes);
switch2.addEventListener('change', checkFailsafes);
switch3.addEventListener('change', checkFailsafes);

/* ==========================================================================
   MECÁNICA 2: PRESURIZACIÓN CONTINUA ("HOLD TO CHARGE")
   ========================================================================== */

function startCharging(e) {
  if (e) e.preventDefault(); // Evitar scroll en pantalla táctil
  if (btnCharge.disabled || isCharging || pressure >= MAX_PRESSURE) return;

  isCharging = true;
  clearInterval(depressureInterval);
  startPressureAudio();

  // Bucle de incremento de presión mientras se mantiene presionado
  chargeInterval = setInterval(() => {
    if (pressure < MAX_PRESSURE) {
      pressure += 3; // Tasa de subida de presión
      if (pressure > MAX_PRESSURE) pressure = MAX_PRESSURE;
      
      updateUI();
      updatePressureAudio(pressure);

      if (pressure >= MAX_PRESSURE) {
        stopCharging();
        triggerAtomicClimax();
      }
    }
  }, 30);
}

function stopCharging() {
  if (!isCharging && pressure === 0) return;
  
  isCharging = false;
  clearInterval(chargeInterval);
  stopPressureAudio();

  // Si se suelta antes de 100 PSI, la presión cae gradualmente (despresurización)
  if (pressure < MAX_PRESSURE) {
    clearInterval(depressureInterval);
    depressureInterval = setInterval(() => {
      if (pressure > 0) {
        pressure -= 2.5; // Tasa de caída de presión
        if (pressure < 0) pressure = 0;
        updateUI();
      } else {
        clearInterval(depressureInterval);
      }
    }, 40);
  }
}

// Event Listeners para Mouse y Pantallas Táctiles
btnCharge.addEventListener('mousedown', startCharging);
btnCharge.addEventListener('mouseup', stopCharging);
btnCharge.addEventListener('mouseleave', stopCharging);

btnCharge.addEventListener('touchstart', startCharging, { passive: false });
btnCharge.addEventListener('touchend', stopCharging);

/* ==========================================================================
   ACTUALIZACIÓN DE INTERFAZ, PLACAS DORSALES Y TEMBLOR
   ========================================================================== */
function updateUI() {
  const currentPsi = Math.floor(pressure);
  
  // 1. Actualizar Manómetro
  pressureBar.style.width = `${pressure}%`;
  pressureReadout.textContent = `${currentPsi} PSI`;

  // 2. Encendido progresivo de las Placas Dorsales del SVG
  // spine-1 (20 PSI), spine-2 (40 PSI), spine-3 (60 PSI), spine-4 (80 PSI), spine-5 (95 PSI)
  const thresholds = [20, 40, 60, 80, 95];
  
  spines.forEach((spine, index) => {
    if (spine) {
      if (pressure >= thresholds[index]) {
        spine.classList.remove('spine-off');
        spine.classList.add('spine-on');
      } else {
        spine.classList.remove('spine-on');
        spine.classList.add('spine-off');
      }
    }
  });

  // 3. Temblor de pantalla (Screen Shake) según la presión
  mainDossier.classList.remove('shake-1', 'shake-2', 'shake-max');
  
  if (pressure > 0 && pressure < 60) {
    mainDossier.classList.add('shake-1');
  } else if (pressure >= 60 && pressure < 85) {
    mainDossier.classList.add('shake-2');
  } else if (pressure >= 85) {
    mainDossier.classList.add('shake-max');
  }
}

/* ==========================================================================
   FASE 3: CLÍMAX Y DESPLIEGUE ATÓMICO
   ========================================================================== */
function triggerAtomicClimax() {
  btnCharge.disabled = true;
  gaugeStatus.textContent = "¡CRÍTICO! SOBRECARGA EN EL NÚCLEO";

  // Mostrar el rayo del aliento atómico en el SVG
  if (atomicBreath) {
    atomicBreath.style.opacity = '1';
  }

  setTimeout(() => {
    playRoarSound();

    // Flashbang Atómico
    flashbang.classList.add('active');

    setTimeout(() => {
      // Ocultar consola y revelar carta final
      mainDossier.classList.add('hidden');
      birthdayCard.classList.remove('hidden');

      // Generar lluvia de partículas/esporas de energía
      createAtomicParticles(70);

      // Disipar flashbang
      flashbang.classList.remove('active');
    }, 600);

  }, 200);
}

/* ==========================================================================
   GENERADOR DE PARTÍCULAS
   ========================================================================== */
function createAtomicParticles(count) {
  particlesContainer.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    const randomLeft = Math.random() * 100;
    const randomSize = Math.random() * 6 + 3;
    const randomDuration = Math.random() * 3 + 2;
    const randomDelay = Math.random() * 2;

    particle.style.left = `${randomLeft}vw`;
    particle.style.width = `${randomSize}px`;
    particle.style.height = `${randomSize}px`;
    particle.style.animationDuration = `${randomDuration}s`;
    particle.style.animationDelay = `${randomDelay}s`;

    particlesContainer.appendChild(particle);
  }
}

/* ==========================================================================
   BOTÓN DE REPETICIÓN (REPLAY) - REINICIO COMPLETO
   ========================================================================== */
btnReplay.addEventListener('click', () => {
  // 1. Activamos el flashbang para hacer una transición limpia
  flashbang.classList.add('active');

  setTimeout(() => {
    // 2. Ocultar la carta y el dossier, y mostrar la terminal inicial (Fase 1)
    birthdayCard.classList.add('hidden');
    mainDossier.classList.add('hidden');
    
    terminalOverlay.classList.remove('hidden');
    terminalOverlay.style.opacity = '1';

    // 3. Resetear las variables de presión y detener cualquier ciclo activo
    pressure = 0;
    isCharging = false;
    clearInterval(chargeInterval);
    clearInterval(depressureInterval);

    // 4. Resetear los interruptores (Palancas) y actualizar sus LEDs
    switch1.checked = false;
    switch2.checked = false;
    switch3.checked = false;
    checkFailsafes(); // Esta función bloqueará el botón y pondrá los LEDs en rojo

    // 5. Resetear Manómetro, animaciones y apagar las placas del SVG
    updateUI(); 
    if (atomicBreath) {
      atomicBreath.style.opacity = '0'; // Ocultar el aliento atómico
    }
    
    // 6. Limpiar la radiación/partículas sobrantes
    particlesContainer.innerHTML = '';

    // 7. Retirar el flashbang para revelar la terminal lista para usarse de nuevo
    flashbang.classList.remove('active');
  }, 600); // Se ejecuta mientras la pantalla está completamente blanca
});