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

            // Calculate the rotation angle of the cube
            float angle = mod(time * 1.0, 2.0 * 3.14159265359); // Ensure the angle is within 0 to 2*PI
            float hue = angle / (2.0 * 3.14159265359); // Map the angle to the range [0, 1]
            
            // Determine which two colors of the rainbow spectrum to interpolate between
            int index1 = int(floor(hue * 6.0));
            int index2 = int(mod(float(index1 + 1), 6.0));
            float t = (hue * 6.0) - float(index1);
            
            // Interpolate between the two colors based on the rotation angle
            vec3 color = vec3(1.0, 1.0, 1.0);

            // Calculate distance from UV center to create a circle
            float dist = distance(vUv, vec2(0.5));
            if (dist < 0.4) {
                color = mix(rainbowColors[index1], rainbowColors[index2], t); // White
                
                if (dist > 0.39) {
                    color = vec3(0.0); // Black
                }
                
            }

            // Add a black outline to the circle
            if (dist > 0.41) {
                 color = vec3(0.0); // Black
            }

            // Check if fragment is near the edges of the cube
            float edgeThreshold = 0.01;
            if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold || vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold) {
                    color = vec3(1.0); // White (Horizontal edges)
                }
                if (vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                    color = vec3(1.0); // White (Vertical edges)
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