/* =========================
   SONORA — FUNDO ANIMADO DA HERO

   Gradiente "mesh" em WebGL que se move devagar atrás da hero
   e reage ao cursor com um brilho suave. Adaptado do
   ShaderBackground (21st.dev Shader Builder, preset "Mesh drift")
   para JavaScript puro, sem dependências.

   Uso: <canvas class="hero-shader" data-hero-shader></canvas>
   dentro de um elemento com position: relative.

   - Usa a paleta do site (definida em PALETTE).
   - Pausa quando a hero sai da tela ou a aba fica oculta.
   - Com "reduzir movimento" ativado no sistema, desenha um
     quadro estático.
   - Sem WebGL, o canvas some e fica o fundo padrão do site.
========================= */

(function () {
    "use strict";

    const canvas = document.querySelector("[data-hero-shader]");
    if (!canvas) return;

    /* =========================
       01. PALETA E AJUSTES
    ========================= */

    // Cores do site em hex. A ordem define o "peso" no gradiente.
    const PALETTE = [
        "#e9e7e1", // --color-bg
        "#f1efea", // --color-bg levemente mais claro (luz)
        "#dfddd6", // fundo dos cards
        "#b3bdee"  // --color-accent (#3155ff) suavizado sobre o fundo
    ];

    const SETTINGS = {
        scale: 1.5,
        intensity: 0.2,
        warp: 0.18,
        detail: 1.664,
        contrast: 1.0,
        brightness: 0.0,
        saturation: 1.0,
        hue: 0.0,
        vignette: 0.0,
        blur: 0.004,
        grain: 0.018,
        seed: 8816.0,
        rotate: 0.3316,
        offsetX: -0.13,
        offsetY: -0.12,
        drift: 0.044,
        timeScale: 0.6,

        cursorEnabled: true,
        cursorEffect: 4.0, // 4 = luz colorida sob o cursor
        cursorStrength: 0.5,
        cursorRadius: 0.46,

        // Cor e força da luz do cursor. Ela tinge o fundo em vez de
        // clarear: 0 = invisível, 1 = cor pura no centro.
        glowColor: "#3155ff", // --color-accent
        glowAmount: 0.62,

        // O gradiente é suave: renderizar em resolução menor
        // economiza GPU sem diferença visível.
        maxPixels: 1200000,
        maxDevicePixelRatio: 1.5
    };

    const MAX_COLORS = 8;


    /* =========================
       02. SHADERS (GLSL)
    ========================= */

    const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, (unused), warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, (unused)
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;     // presence, effect, strength, radius
uniform vec4 u_glow;       // glow colour.rgb, glow amount

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

// Cada cor é um "foco" de luz que orbita devagar pela tela.
vec3 shade(vec2 p, float t) {
  vec3 acc = u_colors[0] * 0.15;
  float total = 0.15;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_colorCount) break;
    float fi = float(i);
    vec2 c = vec2(
      sin(t * (0.21 + fi * 0.071) + fi * 2.4 + u_seed),
      cos(t * (0.17 + fi * 0.093) + fi * 1.7)) * (0.45 + u_intensity * 0.35);
    float w = exp(-dot(p - c, p - c) * 6.0);
    acc += u_colors[i] * w;
    total += w;
  }
  return acc / total;
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  if (u_cursorPresence > 0.001) {
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  p *= u_scale;

  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));

  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }

  vec3 col;
  if (u_blur > 0.0) {
    float pe = u_blur * u_scale;
    col  = shade(p, u_time) * 0.36;
    col += shade(p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(p, u_time);
  }

  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  // Luz do cursor: mistura a cor do brilho com um leve aumento de
  // luminosidade no miolo, sem estourar para o branco.
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5) {
    float glow = cursorMask * u_cursorStrength * u_glow.a;
    col = mix(col, u_glow.rgb, glow);
    col += vec3(0.03) * glow;
  }
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;


    /* =========================
       03. UTILITÁRIOS
    ========================= */

    function hexToRgb(hex) {
        const value = parseInt(hex.replace("#", ""), 16);
        return [
            ((value >> 16) & 255) / 255,
            ((value >> 8) & 255) / 255,
            (value & 255) / 255
        ];
    }

    // O shader sempre recebe 8 cores; as sobras repetem a última.
    function buildColorArray(palette) {
        const colors = palette.slice(0, MAX_COLORS).map(hexToRgb);

        while (colors.length < MAX_COLORS) {
            colors.push(colors[colors.length - 1]);
        }

        return new Float32Array(colors.flat());
    }

    function compileShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn("[hero-shader]", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function createProgram(gl) {
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn("[hero-shader]", gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }


    /* =========================
       04. INICIALIZAÇÃO DO WEBGL
    ========================= */

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    const program = gl && createProgram(gl);

    // Sem WebGL: remove o canvas e mantém o fundo do site.
    if (!program) {
        canvas.remove();
        return;
    }

    gl.useProgram(program);

    // Um único triângulo que cobre toda a tela.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
        colors: gl.getUniformLocation(program, "u_colors"),
        scene: gl.getUniformLocation(program, "u_scene"),
        shape: gl.getUniformLocation(program, "u_shape"),
        surface: gl.getUniformLocation(program, "u_surface"),
        finish: gl.getUniformLocation(program, "u_finish"),
        transform: gl.getUniformLocation(program, "u_transform"),
        space: gl.getUniformLocation(program, "u_space"),
        cursor: gl.getUniformLocation(program, "u_cursor"),
        glow: gl.getUniformLocation(program, "u_glow")
    };

    // Valores fixos: enviados uma única vez.
    gl.uniform3fv(uniforms.colors, buildColorArray(PALETTE));
    gl.uniform4f(uniforms.shape, SETTINGS.scale, SETTINGS.intensity, 0, SETTINGS.warp);
    gl.uniform4f(uniforms.surface, SETTINGS.detail, SETTINGS.contrast, SETTINGS.brightness, SETTINGS.saturation);
    gl.uniform4f(uniforms.finish, SETTINGS.hue, SETTINGS.vignette, SETTINGS.blur, SETTINGS.grain);
    gl.uniform4f(uniforms.transform, SETTINGS.seed, SETTINGS.rotate, SETTINGS.drift, 0);
    gl.uniform4f(uniforms.glow, ...hexToRgb(SETTINGS.glowColor), SETTINGS.glowAmount);


    /* =========================
       05. ESTADO
    ========================= */

    const colorCount = Math.min(PALETTE.length, MAX_COLORS);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const pointer = {
        known: false,
        clientX: 0,
        clientY: 0,
        targetX: 0,
        targetY: 0,
        targetPresence: 0,
        x: 0,
        y: 0,
        presence: 0
    };

    let bounds = canvas.getBoundingClientRect();
    let frameId = 0;
    let lastFrameTime = null;
    let isPageVisible = document.visibilityState === "visible";
    let isInView = true;

    // Ponto de partida do tempo: um quadro "bonito" já no início.
    const startTime = performance.now() - 4000;


    /* =========================
       06. TAMANHO DO CANVAS
    ========================= */

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, SETTINGS.maxDevicePixelRatio);
        const rawWidth = Math.max(1, Math.round(bounds.width * dpr));
        const rawHeight = Math.max(1, Math.round(bounds.height * dpr));
        const pixelScale = Math.min(1, Math.sqrt(SETTINGS.maxPixels / (rawWidth * rawHeight)));

        const width = Math.max(1, Math.round(rawWidth * pixelScale));
        const height = Math.max(1, Math.round(rawHeight * pixelScale));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
        }
    }


    /* =========================
       07. LOOP DE RENDERIZAÇÃO
    ========================= */

    function isAnimated() {
        return !reducedMotion.matches;
    }

    function requestRender() {
        if (isPageVisible && isInView && frameId === 0) {
            frameId = requestAnimationFrame(render);
        }
    }

    function stopRender() {
        if (frameId !== 0) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
        lastFrameTime = null;
    }

    function render(now) {
        frameId = 0;

        if (!isPageVisible || !isInView) return;

        const deltaTime = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;

        // Suaviza o movimento do cursor (segue o alvo com atraso).
        const follow = 1 - Math.exp(-12 * deltaTime);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;
        pointer.presence += (pointer.targetPresence - pointer.presence) * follow;

        resizeCanvas();

        // Com movimento reduzido, o tempo fica congelado.
        const elapsed = isAnimated() ? (now - startTime) / 1000 : 4;

        gl.uniform4f(uniforms.scene, canvas.width, canvas.height, elapsed * SETTINGS.timeScale, colorCount);
        gl.uniform4f(uniforms.space, SETTINGS.offsetX, SETTINGS.offsetY, pointer.x, pointer.y);
        gl.uniform4f(
            uniforms.cursor,
            SETTINGS.cursorEnabled ? pointer.presence : 0,
            SETTINGS.cursorEffect,
            SETTINGS.cursorStrength,
            SETTINGS.cursorRadius
        );

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        const pointerSettling =
            Math.abs(pointer.targetX - pointer.x) > 0.001 ||
            Math.abs(pointer.targetY - pointer.y) > 0.001 ||
            Math.abs(pointer.targetPresence - pointer.presence) > 0.001;

        if (isAnimated() || pointerSettling) {
            requestRender();
        } else {
            lastFrameTime = null;
        }
    }


    /* =========================
       08. CURSOR
    ========================= */

    function updatePointerTarget() {
        if (!pointer.known || bounds.width === 0 || bounds.height === 0) return;

        const isInside =
            pointer.clientX >= bounds.left &&
            pointer.clientX <= bounds.right &&
            pointer.clientY >= bounds.top &&
            pointer.clientY <= bounds.bottom;

        if (!isInside) {
            pointer.targetPresence = 0;
            requestRender();
            return;
        }

        // Converte para -1..1 no espaço do canvas (y para cima).
        const nextX = ((pointer.clientX - bounds.left) / bounds.width) * 2 - 1;
        const nextY = -(((pointer.clientY - bounds.top) / bounds.height) * 2 - 1);

        // Ao entrar, o brilho nasce sob o cursor em vez de "voar" até ele.
        if (pointer.targetPresence === 0 && pointer.presence < 0.01) {
            pointer.x = nextX;
            pointer.y = nextY;
        }

        pointer.targetX = nextX;
        pointer.targetY = nextY;
        pointer.targetPresence = 1;

        requestRender();
    }

    function handlePointerMove(event) {
        // Só o mouse controla o brilho; no toque ele atrapalharia a rolagem.
        if (event.pointerType !== "mouse") return;

        pointer.known = true;
        pointer.clientX = event.clientX;
        pointer.clientY = event.clientY;
        bounds = canvas.getBoundingClientRect();

        updatePointerTarget();
    }

    function handlePointerLeave() {
        pointer.known = false;
        pointer.targetPresence = 0;
        requestRender();
    }


    /* =========================
       09. EVENTOS
    ========================= */

    function updateLayout() {
        bounds = canvas.getBoundingClientRect();
        resizeCanvas();
        updatePointerTarget();
        requestRender();
    }

    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, { passive: true });

    if (SETTINGS.cursorEnabled) {
        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        window.addEventListener("blur", handlePointerLeave);
        document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    }

    new ResizeObserver(updateLayout).observe(canvas);

    // Pausa quando a hero sai da tela.
    new IntersectionObserver(([entry]) => {
        isInView = entry ? entry.isIntersecting : true;

        if (isInView) requestRender();
        else stopRender();
    }).observe(canvas);

    // Pausa quando a aba fica oculta.
    document.addEventListener("visibilitychange", () => {
        isPageVisible = document.visibilityState === "visible";

        if (isPageVisible) requestRender();
        else stopRender();
    });

    reducedMotion.addEventListener("change", requestRender);

    // Se a GPU perder o contexto, volta para o fundo padrão.
    canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        stopRender();
        canvas.remove();
    });


    /* =========================
       10. START
    ========================= */

    resizeCanvas();
    requestRender();
    canvas.classList.add("is-ready");
})();
