<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { theme } from '$lib/stores/theme';
	import type { Theme } from '$lib/stores/theme';

	let host: HTMLDivElement | undefined;

	const vertexShader = `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position.xy, 0.0, 1.0);
		}
	`;

	const fragmentShader = `
		uniform float uTime;
		uniform vec3 uColor1;
		uniform vec3 uColor2;
		uniform vec3 uColor3;
		uniform float uAlpha;
		varying vec2 vUv;

		void main() {
			vec2 uv = vUv;
			float w1 = sin(uv.x * 6.2831853 + uTime * 0.07) * 0.5 + 0.5;
			float w2 = cos(uv.y * 4.1887902 - uTime * 0.055) * 0.5 + 0.5;
			float w3 = sin((uv.x + uv.y) * 3.14159265 + uTime * 0.04) * 0.5 + 0.5;
			vec3 col = mix(uColor1, uColor2, w1 * 0.55 + uv.y * 0.35);
			col = mix(col, uColor3, w2 * 0.22 + w3 * 0.12);
			float vig = smoothstep(1.25, 0.4, length(uv - 0.5));
			gl_FragColor = vec4(col * vig, uAlpha);
		}
	`;

	function themePalette(t: Theme): { c1: number; c2: number; c3: number; alpha: number } {
		if (t === 'midnight') {
			return { c1: 0x040008, c2: 0x12041a, c3: 0x2a0a32, alpha: 0.4 };
		}
		return { c1: 0x06060f, c2: 0x0c1228, c3: 0x1a1f4a, alpha: 0.36 };
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
			const uniforms = {
				uTime: { value: 0 },
				uColor1: { value: new THREE.Color(palette.c1) },
				uColor2: { value: new THREE.Color(palette.c2) },
				uColor3: { value: new THREE.Color(palette.c3) },
				uAlpha: { value: palette.alpha }
			};

			const material = new THREE.ShaderMaterial({
				uniforms,
				vertexShader,
				fragmentShader,
				transparent: true,
				depthWrite: false,
				depthTest: false
			});

			const geometry = new THREE.PlaneGeometry(2, 2);
			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);

			const renderer = new THREE.WebGLRenderer({
				alpha: true,
				antialias: false,
				powerPreference: 'high-performance'
			});
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.setClearColor(0x000000, 0);

			const canvas = renderer.domElement;
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText =
				'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
			host.appendChild(canvas);

			function applyTheme(t: Theme) {
				const p = themePalette(t);
				uniforms.uColor1.value.setHex(p.c1);
				uniforms.uColor2.value.setHex(p.c2);
				uniforms.uColor3.value.setHex(p.c3);
				uniforms.uAlpha.value = p.alpha;
			}

			const unsub = theme.subscribe((t) => applyTheme(t));

			const clock = new THREE.Clock();
			let raf = 0;

			const resize = () => {
				renderer.setSize(window.innerWidth, window.innerHeight);
			};

			const loop = () => {
				if (cancelled) return;
				if (!document.hidden) {
					uniforms.uTime.value = clock.getElapsedTime();
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
				geometry.dispose();
				material.dispose();
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
