import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * VantaBackground
 * Camada de fundo animada usando Vanta.js (efeito FOG por padrão),
 * respeitando prefers-reduced-motion e com fallback em gradiente suave.
 *
 * Observações de design:
 * - Renderiza um <div> absoluto com pointer-events: none para não bloquear o ReactFlow
 * - Instância do Vanta é criada de forma lazy (dynamic import) e destruída no unmount
 * - Flag de recurso via prop ou env: VITE_ENABLE_VANTA ("false" desativa)
 */
const VantaBackground = ({
  effect = 'fog',
  options = {},
  enableAnimatedBackground,
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const vantaInstanceRef = useRef(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Flag de recurso controlada 100% via frontend (prop). Default: true
  const featureEnabled = useMemo(() => enableAnimatedBackground !== false, [enableAnimatedBackground]);

  // Fallback estático (gradiente suave) — permanece visível quando Vanta está desativado
  const fallbackGradient = useMemo(() => ({
    backgroundImage: [
      'radial-gradient( circle at 20% 20%, rgba(43,178,76,0.12), transparent 45% )',
      'radial-gradient( circle at 80% 30%, rgba(74,144,226,0.10), transparent 45% )',
      'linear-gradient(180deg, #0b0f12 0%, #0a0a0a 100%)'
    ].join(', ')
  }), []);

  // Monitorar prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsReducedMotion(Boolean(media.matches));
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  // Inicializar / destruir Vanta
  useEffect(() => {
    const shouldRun = featureEnabled && !isReducedMotion;
    let cancelled = false;

    const destroyVanta = () => {
      if (vantaInstanceRef.current) {
        try { vantaInstanceRef.current.destroy?.(); } catch {}
        vantaInstanceRef.current = null;
      }
    };

    if (!shouldRun) {
      destroyVanta();
      return () => destroyVanta();
    }

    (async () => {
      try {
        // Mapear efeito → módulo (suporte a vários efeitos baseados em three.js)
        const effectKey = String(effect || '').toLowerCase();
        const effectLoader = async () => {
          switch (effectKey) {
            case 'net': {
              const mod = await import('vanta/dist/vanta.net.min');
              return mod.default || mod;
            }
            case 'cells': {
              const mod = await import('vanta/dist/vanta.cells.min');
              return mod.default || mod;
            }
            case 'waves': {
              const mod = await import('vanta/dist/vanta.waves.min');
              return mod.default || mod;
            }
            case 'clouds': {
              const mod = await import('vanta/dist/vanta.clouds.min');
              return mod.default || mod;
            }
            case 'halo': {
              const mod = await import('vanta/dist/vanta.halo.min');
              return mod.default || mod;
            }
            case 'dots': {
              const mod = await import('vanta/dist/vanta.dots.min');
              return mod.default || mod;
            }
            case 'topology': {
              const mod = await import('vanta/dist/vanta.topology.min');
              return mod.default || mod;
            }
            case 'rings': {
              const mod = await import('vanta/dist/vanta.rings.min');
              return mod.default || mod;
            }
            case 'birds': {
              const mod = await import('vanta/dist/vanta.birds.min');
              return mod.default || mod;
            }
            case 'fog':
            default: {
              const mod = await import('vanta/dist/vanta.fog.min');
              return mod.default || mod;
            }
          }
        };

        let EffectFactory;
        let runtimeLib;
        let runtimeKey;

        const usesP5 = effectKey === 'cells';
        if (usesP5) {
          const P5 = await import('p5');
          runtimeLib = P5.default || P5;
          runtimeKey = 'p5';
          if (typeof window !== 'undefined' && !window.p5) {
            try { window.p5 = runtimeLib; } catch {}
          }
          const ef = await effectLoader();
          EffectFactory = ef;
        } else {
          const THREE = await import('three');
          runtimeLib = THREE;
          runtimeKey = 'THREE';
          if (typeof window !== 'undefined' && !window.THREE) {
            try { window.THREE = runtimeLib; } catch {}
          }
          // Compatibilidade com builds do Vanta que esperam THREE.VertexColors (deprecado em versões novas do three)
          try {
            if (runtimeLib && !runtimeLib.VertexColors) {
              runtimeLib.VertexColors = true;
              if (typeof window !== 'undefined') window.THREE.VertexColors = true;
            }
          } catch {}
          const ef = await effectLoader();
          EffectFactory = ef;
        }

        if (cancelled || !containerRef.current) return;

        // Opções padrão por efeito; podem ser sobrescritas via prop
        const defaultsByEffect = {
          fog: {
            highlightColor: 0x2bb24c,
            midtoneColor: 0x2a2a2a,
            lowlightColor: 0x0f0f0f,
            baseColor: 0x0a0a0a,
            blurFactor: 0.6,
            speed: 0.8,
            zoom: 0.8
          },
          net: {
            color: 0x2bb24c,
            backgroundColor: 0x0a0a0a,
            points: 10.0,
            maxDistance: 20.0,
            spacing: 18.0
          },
          dots: {
            backgroundColor: 0x0a0a0a,
            color: 0x2bb24c,
            color2: 0x2bb24c,
            size: 3.0,
            spacing: 35.0,
            showLines: true
          },
          cells: {
            color: 0x2bb24c
          },
          waves: {
            color: 0x2bb24c,
            shininess: 25.0,
            waveHeight: 15.0,
            waveSpeed: 0.75,
            zoom: 0.9
          },
          clouds: {
            skyColor: 0x0a0a0a,
            cloudColor: 0x1a1a1a,
            sunColor: 0x2bb24c,
            speed: 0.5
          }
        };

        const commonDefaults = {
          el: containerRef.current,
          [runtimeKey]: runtimeLib,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0
        };

        const defaultOptions = { ...commonDefaults, ...(defaultsByEffect[effectKey] || {}) };

        // Destruir instância anterior antes de criar outra
        destroyVanta();
        vantaInstanceRef.current = EffectFactory({ ...defaultOptions, ...options });
      } catch (err) {
        // Em caso de erro, mantemos apenas o fallback estático
        if (import.meta?.env?.DEV) console.warn('[VantaBackground] Falha ao inicializar Vanta:', err);
      }
    })();

    return () => {
      cancelled = true;
      const id = requestAnimationFrame(() => destroyVanta());
      cancelAnimationFrame(id);
    };
  }, [featureEnabled, isReducedMotion, effect, options]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        // Fallback gradiente sempre presente; quando Vanta inicializa, ele insere um canvas por cima deste fundo
        ...fallbackGradient,
        ...style
      }}
      aria-hidden="true"
    />
  );
};

export default VantaBackground;


