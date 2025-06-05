// Main module for Aural Vista

// Global configuration and state
const app = {
    dimensions: { x: 5, y: 3, z: 5 },
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    audio: { ctx: null },
    container: document.getElementById('canvas-container'),
};

// Initialize renderer and canvas
function initRenderer() {
    app.renderer = new THREE.WebGLRenderer({ antialias: true });
    app.renderer.setSize(app.container.clientWidth, app.container.clientHeight);
    app.renderer.setPixelRatio(window.devicePixelRatio);
    app.container.appendChild(app.renderer.domElement);
}

// Create or update the scene based on current dimensions
function buildScene() {
    if (!app.renderer) initRenderer();

    app.scene = new THREE.Scene();
    app.scene.fog = new THREE.Fog(0x000000, 10, 50);

    const { x, y, z } = app.dimensions;

    app.camera = new THREE.PerspectiveCamera(60, app.container.clientWidth / app.container.clientHeight, 0.1, 1000);
    app.camera.position.set(x, y, z * 1.5);

    app.controls = new THREE.OrbitControls(app.camera, app.renderer.domElement);

    // Room box
    const roomGeo = new THREE.BoxGeometry(x, y, z);
    const roomMat = new THREE.MeshPhongMaterial({ color: 0x5596e6, transparent: true, opacity: 0.2, side: THREE.BackSide });
    const room = new THREE.Mesh(roomGeo, roomMat);
    app.scene.add(room);

    // Grid helper
    const grid = new THREE.GridHelper(x, x);
    grid.position.y = -y / 2;
    app.scene.add(grid);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    app.scene.add(ambient);

    const point = new THREE.PointLight(0xffffff, 0.8);
    point.position.set(x / 2, y, z / 2);
    app.scene.add(point);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (app.controls) app.controls.update();
    if (app.renderer && app.scene && app.camera) {
        app.renderer.render(app.scene, app.camera);
    }
}

// Handle resizing
window.addEventListener('resize', () => {
    if (!app.renderer) return;
    app.renderer.setSize(app.container.clientWidth, app.container.clientHeight);
    app.camera.aspect = app.container.clientWidth / app.container.clientHeight;
    app.camera.updateProjectionMatrix();
});

// Audio helper
function playTone(position) {
    if (!app.audio.ctx) app.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = app.audio.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = 440;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    osc.connect(panner).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
}

function spawnMarker(point) {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(point);
    app.scene.add(marker);

    // Visual sound wave
    const waveGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, wireframe: true });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.position.copy(point);
    app.scene.add(wave);

    const start = performance.now();
    function expand() {
        const elapsed = performance.now() - start;
        const t = elapsed / 300; // 0.3s animation
        wave.scale.setScalar(1 + t * 5);
        wave.material.opacity = Math.max(0, 0.5 - t);
        if (t < 1) {
            requestAnimationFrame(expand);
        } else {
            app.scene.remove(wave);
        }
    }
    expand();

    playTone(point);
}

// Convert click into 3D position inside the room (front wall intersection)
function onClick(event) {
    if (!app.scene) return;
    const rect = app.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, app.camera);

    const intersects = raycaster.intersectObjects(app.scene.children, true);
    if (intersects.length > 0) {
        spawnMarker(intersects[0].point);
    }
}

// Render button action
document.getElementById('render-btn').addEventListener('click', () => {
    app.dimensions.x = parseFloat(document.getElementById('dim-x').value);
    app.dimensions.y = parseFloat(document.getElementById('dim-y').value);
    app.dimensions.z = parseFloat(document.getElementById('dim-z').value);
    buildScene();
    app.renderer.domElement.addEventListener('click', onClick);
    if (app.audio.ctx) app.audio.ctx.resume();
});

// TODO:
// - Reflect sound from walls for realism
// - Implement Head-Related Transfer Function for panning
