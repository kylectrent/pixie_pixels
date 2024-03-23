import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';


const scene = new THREE.Scene();

scene.add( new THREE.AmbientLight( 0x444444, 3 ) );

				const light1 = new THREE.DirectionalLight( 0xffffff, 1.5 );
				light1.position.set( 1, 1, 1 );
				scene.add( light1 );

				const light2 = new THREE.DirectionalLight( 0xffffff, 4.5 );
				light2.position.set( 0, - 1, 0 );
				scene.add( light2 );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 2, 2, 2 );

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `, // Vertex shader code
    fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        
        void main() {
            vec3 rainbowColors[6];
            rainbowColors[0] = vec3(1.0, 0.0, 0.0); // Red
            rainbowColors[1] = vec3(1.0, 1.0, 0.0); // Yellow
            rainbowColors[2] = vec3(0.0, 1.0, 0.0); // Green
            rainbowColors[3] = vec3(0.0, 1.0, 1.0); // Cyan
            rainbowColors[4] = vec3(0.0, 0.0, 1.0); // Blue
            rainbowColors[5] = vec3(1.0, 0.0, 1.0); // Magenta

            float angle = mod(time * 1.0, 2.0 * 3.14159265359);
            float hue = angle / (2.0 * 3.14159265359);
            int index1 = int(floor(hue * 6.0));
            int index2 = int(mod(float(index1 + 1), 6.0));
            float t = (hue * 6.0) - float(index1);
            vec3 interpolatedColor = mix(rainbowColors[index1], rainbowColors[index2], t);

            // Checkerboard pattern size
            float checkerSize = 0.1; // Size of the checker squares

            // Finer pixelation for the circle's edge
            float finerPixelSize = checkerSize / 5.0; // 5 times finer than the checker size
            vec2 finerPixelatedPos = floor(vUv / finerPixelSize) * finerPixelSize + finerPixelSize * 0.5;
            float finerPixelatedDistToCenter = distance(finerPixelatedPos, vec2(0.5, 0.5));
            bool isNearEdge = abs(finerPixelatedDistToCenter - 0.4) < finerPixelSize; // Adjusted for smaller circle

            // Determine if inside the smaller circle
            float distToCenter = distance(vUv, vec2(0.5, 0.5));
            bool isInsideCircle = distToCenter < 0.4; // Smaller circle radius

            // Thin, transitioning checkerboard lines
            vec2 linePosition = mod(vUv * vec2(1.0 / checkerSize), 1.0);
            bool isLine = linePosition.x < 0.15 || linePosition.y < 0.15; // Thin lines

            vec3 color;
            if (isInsideCircle) {
                if (isNearEdge) {
                    color = vec3(0.0); // Edge color
                } else if (isLine) {
                    color = interpolatedColor; // Transitioning line color inside the circle
                } else {
                    color = vec3(1.0); // Rainbow color outside the lines
                }
            } else {
                color = vec3(0); // Background color outside the circle
            }

            // Check if fragment is near the edges of the cube
            float edgeThreshold = 0.005;
            if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold || vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold) {
                    color = interpolatedColor; // White (Horizontal edges)
                }
                if (vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                    color = interpolatedColor; // White (Vertical edges)
                }
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    ` // Fragment shader code
});
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

const composer = new EffectComposer(renderer);

composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .5, 0.5, 0.1);
composer.addPass(bloomPass);


function animate() {
	requestAnimationFrame( animate );

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

    material.uniforms.time.value = performance.now() / 1000;

    composer.render();

	//renderer.render( scene, camera );
}

animate();