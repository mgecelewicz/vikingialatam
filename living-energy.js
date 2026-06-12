document.addEventListener("DOMContentLoaded", () => {
    const DEBUG_ENERGY = false;
    
    const eCanvas = document.getElementById("living-energy-canvas");
    if (!eCanvas) return;
    
    const eCtx = eCanvas.getContext("2d");
    const eHotspot = document.getElementById("living-energy-hotspot");

    // Añadimos variables físicas: vx (velocidad X), vy (velocidad Y), x e y (posiciones actuales)
    const ENERGY_NODES = [
        { id: 'frente',  nx: 0.45, ny: 0.15, radius: 0.12, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'ojo_izq', nx: 0.38, ny: 0.22, radius: 0.08, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'ojo_der', nx: 0.52, ny: 0.22, radius: 0.08, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'barba',   nx: 0.45, ny: 0.38, radius: 0.15, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'pecho',   nx: 0.45, ny: 0.60, radius: 0.25, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'hom_izq', nx: 0.15, ny: 0.55, radius: 0.20, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'hom_der', nx: 0.75, ny: 0.55, radius: 0.20, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'tor_izq', nx: 0.25, ny: 0.85, radius: 0.18, energy: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'tor_der', nx: 0.65, ny: 0.85, radius: 0.18, energy: 0, x: 0, y: 0, vx: 0, vy: 0 }
    ];

    const EYES_CENTER = {
        left:  { nx: 0.38, ny: 0.22 },
        right: { nx: 0.52, ny: 0.22 }
    };

    const ENERGY_LINKS = [
        ['ojo_izq', 'frente'], ['ojo_der', 'frente'],
        ['ojo_izq', 'barba'],  ['ojo_der', 'barba'],
        ['frente', 'pecho'],   ['barba', 'pecho'],
        ['pecho', 'hom_izq'],  ['pecho', 'hom_der'],
        ['pecho', 'tor_izq'],  ['pecho', 'tor_der'],
        ['hom_izq', 'tor_izq'],['hom_der', 'tor_der']
    ];

    let eW = 0, eH = 0;
    let mouseX = -1000, mouseY = -1000;
    let time = 0;
    let animationFrameId = null;

    // Constantes físicas
    const SPRING = 0.05;    // Tensión del resorte de anclaje
    const FRICTION = 0.85;  // Fricción para suavizar el movimiento

    function resizeLivingCanvas() {
        const rect = eHotspot.getBoundingClientRect();
        // Sincronización para evitar blur en pantallas retina
        const dpr = window.devicePixelRatio || 1;
        eCanvas.width = rect.width * dpr;
        eCanvas.height = rect.height * dpr;
        eCtx.scale(dpr, dpr);
        eW = rect.width;
        eH = rect.height;
        
        // Inicializar posiciones rápidamente
        ENERGY_NODES.forEach(n => {
            n.x = n.nx * eW;
            n.y = n.ny * eH;
        });
    }
    window.addEventListener('resize', resizeLivingCanvas);
    resizeLivingCanvas();

    eHotspot.addEventListener('mousemove', (e) => {
        const rect = eHotspot.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    eHotspot.addEventListener('mouseleave', () => {
        mouseX = -1000; mouseY = -1000;
    });

    function renderLivingEnergy() {
        time += 0.015;
        eCtx.clearRect(0, 0, eW, eH);

        if (!document.body.classList.contains('post-hero-active')) {
            mouseX = -1000; mouseY = -1000;
        }

        eCtx.globalCompositeOperation = 'lighter'; 
        let maxEyeEnergy = 0;

        // 1. ACTUALIZAR FÍSICA DE NODOS
        ENERGY_NODES.forEach((node, index) => {
            let baseNX = node.nx * eW;
            let baseNY = node.ny * eH;
            
            // Ruido orgánico flotante (respiración)
            let noiseX = Math.sin(time * 2 + index) * (eW * 0.01);
            let noiseY = Math.cos(time * 1.5 + index) * (eW * 0.01);

            // Interacción magnética con el Mouse
            let dx = mouseX - baseNX;
            let dy = mouseY - baseNY;
            let dist = Math.hypot(dx, dy);
            let triggerRadius = node.radius * eW;
            
            let forceX = 0, forceY = 0;
            let targetEnergy = 0.0;

            if (dist < triggerRadius * 1.5) {
                // Atraer ligeramente hacia el ratón si está cerca
                let pull = (triggerRadius * 1.5 - dist) * 0.05;
                forceX = (dx / dist) * pull;
                forceY = (dy / dist) * pull;
                targetEnergy = 1.0;
            }

            // Aplicar Ley de Hooke (Física elástica) hacia la posición objetivo
            let targetX = baseNX + noiseX + forceX;
            let targetY = baseNY + noiseY + forceY;

            node.vx += (targetX - node.x) * SPRING;
            node.vy += (targetY - node.y) * SPRING;
            
            // Aplicar fricción
            node.vx *= FRICTION;
            node.vy *= FRICTION;
            
            // Actualizar posición final
            node.x += node.vx;
            node.y += node.vy;

            // Decaimiento y crecimiento suave de energía
            node.energy += (targetEnergy - node.energy) * 0.05; 

            if (node.id === 'ojo_izq' || node.id === 'ojo_der') {
                if (node.energy > maxEyeEnergy) maxEyeEnergy = node.energy;
            }
        });

        // 2. DIBUJAR NERVIOS CURVOS Y FLUJO SINÁPTICO
        ENERGY_LINKS.forEach((link, idx) => {
            let n1 = ENERGY_NODES.find(n => n.id === link[0]);
            let n2 = ENERGY_NODES.find(n => n.id === link[1]);
            
            if (!n1 || !n2) return;
            let avgEnergy = (n1.energy + n2.energy) / 2;
            
            // Siempre dibujar una leve red estructural biológica
            let baseAlpha = 0.1 + (avgEnergy * 0.7);
            
            // Calcular curva bezier (offset dinámico por índice para orgánicidad)
            let midX = (n1.x + n2.x) / 2;
            let midY = (n1.y + n2.y) / 2;
            let cdx = n2.x - n1.x;
            let cdy = n2.y - n1.y;
            
            let curveOffset = Math.sin(time + idx) * 0.3;
            let cpX = midX - cdy * curveOffset;
            let cpY = midY + cdx * curveOffset;

            // DIBUJAR NERVIO (TRAYECTORIA)
            eCtx.beginPath();
            eCtx.moveTo(n1.x, n1.y);
            eCtx.quadraticCurveTo(cpX, cpY, n2.x, n2.y);
            
            // Glow nativo del canvas
            eCtx.shadowBlur = 15 * avgEnergy;
            eCtx.shadowColor = `rgba(212, 175, 55, ${avgEnergy})`; // Viking Gold
            
            eCtx.strokeStyle = `rgba(255, 200, 100, ${baseAlpha})`;
            eCtx.lineWidth = 1 + (avgEnergy * 2);
            eCtx.stroke();
            eCtx.shadowBlur = 0; // reset

            // DIBUJAR PARTÍCULAS DE DATOS VIAJANDO
            // A mayor energía, viajan más rápido y más brillantes
            if (avgEnergy > 0.05) {
                let speedMultiplier = 1 + (avgEnergy * 3);
                let flowProgress = ((time * speedMultiplier) + (idx * 0.1)) % 1;
                
                // Ecuación de curva Bézier cuadrática
                let t = flowProgress;
                let flowX = (1-t)*(1-t)*n1.x + 2*(1-t)*t*cpX + t*t*n2.x;
                let flowY = (1-t)*(1-t)*n1.y + 2*(1-t)*t*cpY + t*t*n2.y;

                eCtx.beginPath();
                eCtx.arc(flowX, flowY, 1.5 + (avgEnergy * 2), 0, Math.PI * 2);
                eCtx.fillStyle = `rgba(255, 255, 255, ${avgEnergy})`;
                eCtx.shadowBlur = 10;
                eCtx.shadowColor = "white";
                eCtx.fill();
                eCtx.shadowBlur = 0;
            }
        });

        // 3. DIBUJAR PULSOS DE NODOS SOLARES
        ENERGY_NODES.forEach(node => {
            if (node.energy > 0.01) {
                let coreSize = (eW * 0.02) * node.energy;
                let glowSize = (eW * 0.08) * node.energy + (Math.sin(time*10)*3); // palpitación rápida
                
                let grad = eCtx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
                grad.addColorStop(0, `rgba(255, 255, 255, ${node.energy})`);
                grad.addColorStop(0.15, `rgba(212, 175, 55, ${node.energy * 0.8})`); // Gold
                grad.addColorStop(1, `rgba(212, 175, 55, 0)`);
                
                eCtx.fillStyle = grad;
                eCtx.beginPath();
                eCtx.arc(node.x, node.y, glowSize, 0, Math.PI*2);
                eCtx.fill();

                // Núcleo sólido interior
                eCtx.fillStyle = `rgba(255, 255, 255, ${node.energy * 0.9})`;
                eCtx.beginPath();
                eCtx.arc(node.x, node.y, coreSize, 0, Math.PI*2);
                eCtx.fill();
            }
        });

        // 4. DIBUJAR DESTELLO DE OJOS CIAN (CINEMATIC LENS FLARE)
        if (maxEyeEnergy > 0.01) {
            ['left', 'right'].forEach(side => {
                // Anclamos los destellos a las coordenadas físicas actuales de los nodos de los ojos
                let eyeNode = side === 'left' ? ENERGY_NODES[1] : ENERGY_NODES[2];
                let ex = eyeNode.x;
                let ey = eyeNode.y;

                // Glow radial primario
                let eyeGlow = eCtx.createRadialGradient(ex, ey, 0, ex, ey, 70 * maxEyeEnergy);
                eyeGlow.addColorStop(0, `rgba(0, 255, 255, ${maxEyeEnergy})`);
                eyeGlow.addColorStop(0.3, `rgba(0, 180, 255, ${maxEyeEnergy * 0.5})`);
                eyeGlow.addColorStop(1, `rgba(0, 255, 255, 0)`);
                eCtx.fillStyle = eyeGlow;
                eCtx.beginPath(); eCtx.arc(ex, ey, 70 * maxEyeEnergy, 0, Math.PI*2); eCtx.fill();

                // Línea anamórfica hiper-ancha (Falsa óptica de lente anamórfica de cine)
                let flareWidth = 250 * maxEyeEnergy;
                let flareGrad = eCtx.createRadialGradient(ex, ey, 0, ex, ey, flareWidth);
                flareGrad.addColorStop(0, `rgba(255, 255, 255, ${maxEyeEnergy})`);
                flareGrad.addColorStop(0.05, `rgba(0, 229, 255, ${maxEyeEnergy * 0.8})`);
                flareGrad.addColorStop(1, `rgba(0, 229, 255, 0)`);
                eCtx.fillStyle = flareGrad;
                
                eCtx.beginPath();
                eCtx.ellipse(ex, ey, flareWidth, 1.2 + (maxEyeEnergy * 0.5), 0, 0, Math.PI*2);
                eCtx.fill();
            });
        }

        if (DEBUG_ENERGY) {
            eCtx.globalCompositeOperation = 'source-over';
            eCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; eCtx.strokeRect(0,0, eW, eH);
            eCtx.fillStyle = 'white'; eCtx.font = "12px monospace";
            eCtx.fillText(`Mouse: ${mouseX.toFixed(0)}, ${mouseY.toFixed(0)}`, 20, 30);

            ENERGY_NODES.forEach(n => {
                eCtx.beginPath(); eCtx.arc(n.x, n.y, n.radius * eW, 0, Math.PI*2);
                eCtx.strokeStyle = 'rgba(0, 255, 255, 0.5)'; eCtx.stroke();
                eCtx.fillText(n.id, n.x + 10, n.y);
            });
        }

        animationFrameId = requestAnimationFrame(renderLivingEnergy);
    }
    
    renderLivingEnergy();
});