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
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = Math.pow(0.9, 4.0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);



// Particle System Setup
const particlesCount = 5000;
const particlesGeometry = new THREE.BufferGeometry();
const posArray = new Float32Array(particlesCount * 3); // x,y,z for each particle

for (let i = 0; i < particlesCount * 3; i++) {
    // Fill the position array with random values
    posArray[i] = (Math.random() - 0.5) * 10; // Spread particles over an area
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.025,
    color: 0xffffff,
    transparent: true,
    depthWrite: true,  // Ensure that particles write to the depth buffer
    blending: THREE.AdditiveBlending  // Optional: for a glow effect
});


const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
particleSystem.sortParticles = true;
scene.add(particleSystem);

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
        
        // Updated line function
        float line(vec2 p, vec2 a, vec2 b, float width) {
            vec2 ap = p - a;
            vec2 ab = b - a;
            float t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
            float dist = length(ap - t * ab);
            return dist < width ? 1.0 : 0.0; // Draw if within width
        }

        void main() {
            //array of rainbow colors to transition between for the lines
            vec3 rainbowColors[6];
            rainbowColors[0] = vec3(1.0, 0.0, 0.0); // Red
            rainbowColors[1] = vec3(1.0, 1.0, 0.0); // Yellow
            rainbowColors[2] = vec3(0.0, 1.0, 0.0); // Green
            rainbowColors[3] = vec3(0.0, 1.0, 1.0); // Cyan
            rainbowColors[4] = vec3(0.0, 0.0, 1.0); // Blue
            rainbowColors[5] = vec3(1.0, 0.0, 1.0); // Magenta

            // Time-based expansion for the matrix water ripple effect
            float expansionRate = 0.15;
            float bandWidth = 0.15; // Width of the rainbow band as it expands
            float maxRadius = .35;
            float timeBetweenStarts = maxRadius / expansionRate; // Time it takes for a band to reach the max radius

            float distToCenter = distance(vUv, vec2(0.5, 0.5));

            // matrix pattern, only visible when in the bounderies of a 'ripple' expanding outward
            float matrixSquareSize = 0.05;
            vec2 linePosition = mod(vUv * vec2(1.0 / matrixSquareSize), 1.0);
            bool isMatrixLine = linePosition.x < 0.1 || linePosition.y < 0.1;

            vec3 color = vec3(0.0); // Default backbackground color of black

            // Calculate the dynamic rainbow color
            float hue = mod(time * 0.1, 1.0);
            int index1 = int(floor(hue * 6.0));
            int index2 = int(mod(float(index1 + 1), 6.0));
            float t = fract(hue * 6.0); // Fractional part for smooth color transition
            vec3 lineColor = mix(rainbowColors[index1], rainbowColors[index2], t);

            // Calculate how many ripple bands should be active based on the current time
            float firstBandStartTime = 0.0;
            float maxBandIndex = floor((time - firstBandStartTime) / (maxRadius / expansionRate));

            //apply the color if it is a grid line AND is within the current ripple
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
            float edgeThreshold = 0.011;
            if (vUv.x < edgeThreshold || vUv.x > 1.0 - edgeThreshold || vUv.y < edgeThreshold || vUv.y > 1.0 - edgeThreshold) {
                color = lineColor; // Rainbow color at the cube's edges
            }

            // Convert UV coordinates from [0,1] range to [-1,1] range (centered), for the purpose of drawing a circle with star in it
            vec2 centeredUv = vUv * 2.0 - 1.0;

            // Parameters for the circle
            float circleRadius = 0.8; // Circle radius
            float lineWidth = 0.04 * .333; // Line width for drawing
            float outlineWidth = 0.04; // Width of the outline

            // Calculate the length from the center to the current fragment
            float len = length(centeredUv);

            // Create the circle outline by subtracting two smoothsteps to create a border
            float innerEdge = circleRadius - outlineWidth;
            float outerEdge = circleRadius;
            float circle = smoothstep(innerEdge, innerEdge + 0.005, len) - smoothstep(outerEdge, outerEdge + 0.005, len);

            // Updated positions of the five star points
            float angleIncrement = 3.14159 * 2.0 / 5.0;
            vec2 starPoints[5];
            for (int i = 0; i < 5; i++) {
                float angle = angleIncrement * float(i) + 3.14159 / 2.0; // Rotate to start at the top
                starPoints[i] = vec2(cos(angle), sin(angle)) * circleRadius;
            }

            // Connect the star points with lines
            float starMask = 0.0;
            starMask += line(centeredUv, starPoints[0], starPoints[2], lineWidth);
            starMask += line(centeredUv, starPoints[2], starPoints[4], lineWidth);
            starMask += line(centeredUv, starPoints[4], starPoints[1], lineWidth);
            starMask += line(centeredUv, starPoints[1], starPoints[3], lineWidth);
            starMask += line(centeredUv, starPoints[3], starPoints[0], lineWidth);
                    
            vec3 starColor1 = vec3(1.0, 1.0, 0.9);  // Lighter yellowish-white
            vec3 starColor2 = vec3(1.0, 1.0, 0.0); // Yellow
    
            // Check for line drawing, color if line
            if (starMask > 0.0) {
                color = mix(starColor1, starColor2, 0.5); // 50% blend;
            }

            // Draw circle outline
            if (circle > 0.0) {
                color = mix(starColor1, starColor2, 0.5);
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

let bloomParams = {
    strength: 1,
    threshold: 0.85,
    radius: 0.4
};

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), bloomParams.strength, bloomParams.radius, bloomParams.threshold);
composer.addPass(bloomPass);



function animate() {
	requestAnimationFrame( animate );
    particleSystem.rotation.y += 0.002; // Optional: rotate the particle system


	//cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

    // Update the time for shader material
    material.uniforms.time.value = performance.now() / 1000;

    // Update bloom strength dynamically to create a pulsating glow effect
    const time = Date.now() * 0.002;  // Get time in seconds
    bloomPass.strength = 1 + Math.sin(time) * 0.5;  // Oscillate strength between 0.5 and 1.5

    // Optionally, adjust threshold or radius similarly if needed
    // bloomPass.threshold = 0.85 + Math.sin(time) * 0.1;
    composer.render();

	//renderer.render( scene, camera );
}

animate();