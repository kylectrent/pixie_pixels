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

const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('./flower-of-life.jpg'); // Replace with the path to your image

backgroundTexture.wrapS = THREE.RepeatWrapping;
backgroundTexture.wrapT = THREE.RepeatWrapping;

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        backgroundTexture: { value: backgroundTexture }
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
        uniform sampler2D backgroundTexture;

        float bandRadius(float startTime, float speed, float maxRadius) {
            return mod((time - startTime) * speed, maxRadius);
        }

        // Function to rotate UV coordinates
        vec2 rotateUV(vec2 uv, float rotation, vec2 pivot) {
            float cosRotation = cos(rotation);
            float sinRotation = sin(rotation);
            uv -= pivot; // Move the pivot to the origin
            uv = vec2(
                uv.x * cosRotation + uv.y * sinRotation,
                -uv.x * sinRotation + uv.y * cosRotation
            );
            uv += pivot; // Move the origin back to the pivot
            return uv;
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
            float bandWidth = 0.2; // Width of the rainbow band as it expands
            float maxRadius = .35;
            float timeBetweenStarts = maxRadius / expansionRate; // Time it takes for a band to reach the max radius

            float distToCenter = distance(vUv, vec2(0.5, 0.5));

            // Checkerboard pattern
            float matrixSquareSize = 0.1;
            vec2 linePosition = mod(vUv * vec2(1.0 / matrixSquareSize), 1.0);
            bool isMatrixLine = linePosition.x < 0.1 || linePosition.y < 0.1;

            // Define the pivot point of the rotation as the center of the texture
            vec2 pivot = vec2(0.5, 0.5);
            // Calculate the rotation amount (negative for clockwise)
            float rotationSpeed = -0.5; // This determines the speed of the rotation
            float rotation = time * rotationSpeed;

            // Rotate the UV coordinates
            vec2 rotatedUV = rotateUV(vUv, rotation, pivot);
            // Sample the texture with the rotated UV coordinates
            vec4 texColor = texture2D(backgroundTexture, rotatedUV);
            

            // Calculate the dynamic rainbow color
            float hue = mod(time * 0.1, 1.0);
            int index1 = int(floor(hue * 6.0));
            int index2 = int(mod(float(index1 + 1), 6.0));
            float t = fract(hue * 6.0); // Fractional part for smooth color transition
            vec3 lineColor = mix(rainbowColors[index1], rainbowColors[index2], t);

            // Calculate how many bands should be active based on the current time
            float firstBandStartTime = 0.0;
            float maxBandIndex = floor((time - firstBandStartTime) / (maxRadius / expansionRate));
            
            // Apply a fade effect to the texture color based on the distance to the center
            float distanceToCenter = length(vUv - vec2(0.5, 0.5));
            float fade = smoothstep(0.4, 0.5, distanceToCenter); // Adjust these values as needed
            texColor.rgb *= (1.0 - fade);
            
            for (float i = 0.0; i <= maxBandIndex; i++) {
                float startTime = firstBandStartTime + (maxRadius / expansionRate) * i;
                float currentRadius = expansionRate * (time - startTime);

                if (currentRadius - distToCenter > 0.0 && currentRadius - distToCenter < bandWidth && isMatrixLine) {
                    float hue = mod(startTime * 0.1, 1.0);
                    int index1 = int(floor(hue * 6.0));
                    int index2 = int(mod(float(index1 + 1), 6.0));
                    float t = fract(hue * 6.0);
                    texColor = vec4(lineColor, 1.0);
                    break; // Exit loop after finding the first applicable band
                }
            }

            // Apply rainbow color to the cube's edges for a pulsing effect
            float edgeThreshold = 0.01;
            if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold || vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                texColor = vec4(lineColor, 1.0); // Rainbow color at the cube's edges
            }

            // For instance, if you want to simply display the texture:
            gl_FragColor = texColor;
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