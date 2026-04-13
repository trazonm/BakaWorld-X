<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { theme } from '$lib/stores/theme';
	import type { Theme } from '$lib/stores/theme';

	let host: HTMLDivElement | undefined;

	const bgVertexShader = /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position.xy, 0.0, 1.0);
		}
	`;

	const bgFragmentShader = /* glsl */ `
		uniform float uTime;
		uniform vec3 uColor1;
		uniform vec3 uColor2;
		uniform vec3 uColor3;
		uniform vec3 uAccent;
		uniform float uAlpha;
		varying vec2 vUv;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
		}

		float noise(vec2 p) {
			vec2 i = floor(p);
			vec2 f = fract(p);
			float a = hash(i);
			float b = hash(i + vec2(1.0, 0.0));
			float c = hash(i + vec2(0.0, 1.0));
			float d = hash(i + vec2(1.0, 1.0));
			vec2 u = f * f * (3.0 - 2.0 * f);
			return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
		}

		float fbm(vec2 p) {
			float v = 0.0;
			float a = 0.5;
			mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
			for (int i = 0; i < 5; i++) {
				v += a * noise(p);
				p = m * p;
				a *= 0.5;
			}
			return v;
		}

		void main() {
			vec2 uv = vUv;
			float t = uTime;

			vec2 flow = vec2(
				fbm(uv * 2.2 + vec2(t * 0.04, -t * 0.03)),
				fbm(uv * 2.2 + vec2(-t * 0.035, t * 0.042))
			);
			vec2 warped = uv + (flow - 0.5) * 0.18;

			float bandA = sin(warped.x * 6.2831853 + t * 0.09) * 0.5 + 0.5;
			float bandB = cos(warped.y * 4.1887902 - t * 0.065) * 0.5 + 0.5;
			float bandC = sin((warped.x + warped.y * 0.85) * 3.14159265 + t * 0.048) * 0.5 + 0.5;
			float mist = fbm(warped * 3.5 + t * 0.07);

			vec3 col = mix(uColor1, uColor2, bandA * 0.55 + uv.y * 0.32);
			col = mix(col, uColor3, bandB * 0.2 + bandC * 0.14 + mist * 0.18);

			vec2 orbUv = uv - vec2(0.62 + sin(t * 0.11) * 0.04, 0.35 + cos(t * 0.09) * 0.05);
			float orb = smoothstep(0.55, 0.0, length(orbUv)) * 0.22;
			col += uAccent * orb;

			vec2 orb2Uv = uv - vec2(0.18 + cos(t * 0.08) * 0.05, 0.72 + sin(t * 0.1) * 0.04);
			float orb2 = smoothstep(0.7, 0.0, length(orb2Uv)) * 0.12;
			col += mix(uAccent, uColor3, 0.35) * orb2;

			float vig = smoothstep(1.35, 0.38, length(uv - 0.5));
			float grain = (hash(uv * 1200.0 + t) - 0.5) * 0.012;
			col += grain;

			gl_FragColor = vec4(col * vig, uAlpha);
		}
	`;

	const particleVertexShader = /* glsl */ `
		attribute float aPhase;
		attribute float aSize;
		uniform float uTime;
		uniform vec2 uResolution;
		varying float vTwinkle;

		void main() {
			vec3 pos = position;
			float t = uTime;
			float slow = t * 0.35;

			pos.x += sin(slow + aPhase) * 0.11 + sin(t * 0.12 + aPhase * 2.7) * 0.045;
			pos.y += cos(slow * 0.9 + aPhase * 1.6) * 0.1 + cos(t * 0.1 + aPhase) * 0.038;
			pos.x += sin(t * 0.18 + aPhase * 4.2) * 0.02;

			vTwinkle = sin(t * 2.2 + aPhase * 11.0) * 0.5 + 0.5;

			gl_Position = vec4(pos.xy, 0.0, 1.0);

			float scale = max(uResolution.y / 900.0, 0.55);
			gl_PointSize = aSize * scale * (18.0 + 16.0 * vTwinkle);
		}
	`;

	const particleFragmentShader = /* glsl */ `
		uniform vec3 uAccent;
		varying float vTwinkle;

		void main() {
			vec2 c = gl_PointCoord - 0.5;
			float r = length(c);
			if (r > 0.5) discard;

			float soft = smoothstep(0.5, 0.0, r);
			float core = exp(-r * r * 14.0);
			float glow = mix(0.35, 1.0, vTwinkle);
			vec3 rgb = uAccent * (0.15 + core * 1.25) * soft * glow * 0.55;
			gl_FragColor = vec4(rgb, 1.0);
		}
	`;

	function themePalette(t: Theme): { c1: number; c2: number; c3: number; alpha: number; accent: number } {
		if (t === 'midnight') {
			return { c1: 0x040008, c2: 0x12041a, c3: 0x2a0a32, alpha: 0.44, accent: 0xf472b6 };
		}
		return { c1: 0x06060f, c2: 0x0c1228, c3: 0x1a1f4a, alpha: 0.4, accent: 0xa78bfa };
	}

	let teardown: (() => void) | undefined;

	onMount(() => {
		if (!browser || !host) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		let cancelled = false;

		void (async () => {
			const THREE = await import('three');
			if (cancelled || !host) return;

			const scene = new THREE.Scene();
			const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

			const palette = themePalette(get(theme) as Theme);
			const bgUniforms = {
				uTime: { value: 0 },
				uColor1: { value: new THREE.Color(palette.c1) },
				uColor2: { value: new THREE.Color(palette.c2) },
				uColor3: { value: new THREE.Color(palette.c3) },
				uAccent: { value: new THREE.Color(palette.accent) },
				uAlpha: { value: palette.alpha }
			};

			const bgMaterial = new THREE.ShaderMaterial({
				uniforms: bgUniforms,
				vertexShader: bgVertexShader,
				fragmentShader: bgFragmentShader,
				transparent: true,
				depthWrite: false,
				depthTest: false
			});

			const bgGeometry = new THREE.PlaneGeometry(2, 2);
			const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
			bgMesh.renderOrder = 0;
			scene.add(bgMesh);

			const particleCount = 1600;
			const positions = new Float32Array(particleCount * 3);
			const phases = new Float32Array(particleCount);
			const sizes = new Float32Array(particleCount);

			for (let i = 0; i < particleCount; i++) {
				positions[i * 3] = Math.random() * 2.2 - 1.1;
				positions[i * 3 + 1] = Math.random() * 2.2 - 1.1;
				positions[i * 3 + 2] = 0;
				phases[i] = Math.random() * Math.PI * 2;
				sizes[i] = Math.random() * 1.4 + 0.4;
			}

			const particleGeometry = new THREE.BufferGeometry();
			particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
			particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

			const particleUniforms = {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				uAccent: { value: new THREE.Color(palette.accent) }
			};

			const particleMaterial = new THREE.ShaderMaterial({
				uniforms: particleUniforms,
				vertexShader: particleVertexShader,
				fragmentShader: particleFragmentShader,
				transparent: true,
				depthWrite: false,
				depthTest: false,
				blending: THREE.AdditiveBlending
			});

			const particles = new THREE.Points(particleGeometry, particleMaterial);
			particles.frustumCulled = false;
			particles.renderOrder = 1;
			scene.add(particles);

			const renderer = new THREE.WebGLRenderer({
				alpha: true,
				antialias: true,
				powerPreference: 'high-performance'
			});
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setClearColor(0x000000, 0);

			const canvas = renderer.domElement;
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText =
				'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
			host.appendChild(canvas);

			function applyTheme(t: Theme) {
				const p = themePalette(t);
				bgUniforms.uColor1.value.setHex(p.c1);
				bgUniforms.uColor2.value.setHex(p.c2);
				bgUniforms.uColor3.value.setHex(p.c3);
				bgUniforms.uAccent.value.setHex(p.accent);
				bgUniforms.uAlpha.value = p.alpha;
				particleUniforms.uAccent.value.setHex(p.accent);
			}

			const unsub = theme.subscribe((t) => applyTheme(t));

			const clock = new THREE.Clock();
			let raf = 0;

			const resize = () => {
				const w = window.innerWidth;
				const h = window.innerHeight;
				renderer.setSize(w, h);
				particleUniforms.uResolution.value.set(w, h);
			};

			const loop = () => {
				if (cancelled) return;
				if (!document.hidden) {
					const elapsed = clock.getElapsedTime();
					bgUniforms.uTime.value = elapsed;
					particleUniforms.uTime.value = elapsed;
					renderer.render(scene, camera);
				}
				raf = requestAnimationFrame(loop);
			};

			window.addEventListener('resize', resize);
			raf = requestAnimationFrame(loop);

			teardown = () => {
				cancelled = true;
				window.removeEventListener('resize', resize);
				cancelAnimationFrame(raf);
				unsub();
				bgGeometry.dispose();
				bgMaterial.dispose();
				particleGeometry.dispose();
				particleMaterial.dispose();
				renderer.dispose();
				canvas.remove();
			};
		})();

		return () => {
			cancelled = true;
			teardown?.();
			teardown = undefined;
		};
	});
</script>

<div
	bind:this={host}
	class="pointer-events-none fixed inset-0 z-0"
	aria-hidden="true"
></div>
