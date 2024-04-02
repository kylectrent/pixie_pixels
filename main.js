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

        float bandRadius(float startTime, float speed, float maxRadius) {
            return mod((time - startTime) * speed, maxRadius);
        }

        void main() {
            vec3 rainbowColors[6];
            rainbowColors[0] = vec3(1.0, 0.0, 0.0); // Red
            rainbowColors[1] = vec3(1.0, 1.0, 0.0); // Yellow
            rainbowColors[2] = vec3(0.0, 1.0, 0.0); // Green
            rainbowColors[3] = vec3(0.0, 1.0, 1.0); // Cyan
            rainbowColors[4] = vec3(0.0, 0.0, 1.0); // Blue
            rainbowColors[5] = vec3(1.0, 0.0, 1.0); // Magenta

            // Time-based expansion for the doughnut effect
            float expansionRate = 0.15;
            float bandWidth = 0.09; // Width of the rainbow band as it expands
            float maxRadius = .35;
            float timeBetweenStarts = maxRadius / expansionRate; // Time it takes for a band to reach the max radius

            float distToCenter = distance(vUv, vec2(0.5, 0.5));

            // Checkerboard pattern
            float matrixSquareSize = 0.1;
            vec2 linePosition = mod(vUv * vec2(1.0 / matrixSquareSize), 1.0);
            bool isMatrixLine = linePosition.x < 0.05 || linePosition.y < 0.05;

            vec3 color = vec3(0.0); // Default backbackground color

            // Calculate the dynamic rainbow color
            float hue = mod(time * 0.1, 1.0);
            int index1 = int(floor(hue * 6.0));
            int index2 = int(mod(float(index1 + 1), 6.0));
            float t = fract(hue * 6.0); // Fractional part for smooth color transition
            vec3 lineColor = mix(rainbowColors[index1], rainbowColors[index2], t);

            // Calculate how many bands should be active based on the current time
            float firstBandStartTime = 0.0;
            float maxBandIndex = floor((time - firstBandStartTime) / (maxRadius / expansionRate));

            for (float i = 0.0; i <= maxBandIndex; i++) {
                float startTime = firstBandStartTime + (maxRadius / expansionRate) * i;
                float currentRadius = expansionRate * (time - startTime);

                if (currentRadius - distToCenter > 0.0 && currentRadius - distToCenter < bandWidth && isMatrixLine) {
                    float hue = mod(startTime * 0.1, 1.0);
                    int index1 = int(floor(hue * 6.0));
                    int index2 = int(mod(float(index1 + 1), 6.0));
                    float t = fract(hue * 6.0);
                    color = lineColor;
                    break; // Exit loop after finding the first applicable band
                }
            }



            // Apply rainbow color to the cube's edges for a pulsing effect
            float edgeThreshold = 0.005;
            if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold || vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                color = lineColor; // Rainbow color at the cube's edges
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

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .1, 0.1, 0.1);
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