let scene, camera, renderer, player, controls, audioContext, shootSound;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, sprint = false;
let bullets = [], enemies = [];
let clock = new THREE.Clock();
let targetFPS = 60;
let graphicsSettings = 'balanced';

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 100);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    updateGraphicsSettings();
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Player
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.castShadow = true;
    scene.add(player);
    player.position.set(0, 0.5, 0);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadShootSound();

    // Enemies
    spawnEnemies();

    // Controls
    setupControls();

    // Events
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);

    animate();
}

function updateGraphicsSettings() {
    let pixelRatio, shadowMapEnabled, shadowMapSize, anisotropy;
    switch (graphicsSettings) {
        case 'smooth':
            pixelRatio = 0.5;
            shadowMapEnabled = false;
            shadowMapSize = 512;
            anisotropy = 1;
            break;
        case 'balanced':
            pixelRatio = 1;
            shadowMapEnabled = true;
            shadowMapSize = 1024;
            anisotropy = 2;
            break;
        case 'hd':
            pixelRatio = 1.5;
            shadowMapEnabled = true;
            shadowMapSize = 2048;
            anisotropy = 4;
            break;
        case 'ultrahd':
            pixelRatio = 2;
            shadowMapEnabled = true;
            shadowMapSize = 4096;
            anisotropy = 8;
            break;
        case 'extremehd':
            pixelRatio = 2.5;
            shadowMapEnabled = true;
            shadowMapSize = 8192;
            anisotropy = 16;
            break;
        case 'qhdr':
            pixelRatio = 3;
            shadowMapEnabled = true;
            shadowMapSize = 16384;
            anisotropy = 16;
            break;
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = shadowMapEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene.traverse(obj => {
        if (obj.material && obj.material.map) {
            obj.material.map.anisotropy = anisotropy;
            obj.material.needsUpdate = true;
        }
    });
}

function loadShootSound() {
    const buffer = new AudioBuffer({
        length: 44100 * 0.2,
        sampleRate: 44100
    });
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 10);
    }
    shootSound = audioContext.createBufferSource();
    shootSound.buffer = buffer;
}

function toggleSettings() {
    const settings = document.getElementById('settings');
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
}

function setupControls() {
    controls = new THREE.PointerLockControls(camera, document.body);
    document.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => document.getElementById('settingsIcon').style.display = 'none');
    controls.addEventListener('unlock', () => document.getElementById('settingsIcon').style.display = 'block');
}

function spawnEnemies() {
    for (let i = 0; i < 8; i++) {
        const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.castShadow = true;
        enemy.position.set(
            Math.random() * 50 - 25,
            0.5,
            Math.random() * 50 - 25
        );
        enemy.velocity = new THREE.Vector3();
        scene.add(enemy);
        enemies.push(enemy);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': sprint = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': sprint = false; break;
    }
}

function onMouseDown(event) {
    if (controls.isLocked) {
        // Bullet
        const bulletGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.copy(camera.position);
        bullet.velocity = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(50);
        scene.add(bullet);
        bullets.push(bullet);

        // Muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
        scene.add(flash);
        setTimeout(() => scene.remove(flash), 50);

        // Play shoot sound
        const source = audioContext.createBufferSource();
        source.buffer = shootSound.buffer;
        source.connect(audioContext.destination);
        source.start();
    }
}

function applySettings() {
    targetFPS = parseInt(document.getElementById('fpsSelect').value);
    graphicsSettings = document.getElementById('graphicsSelect').value;
    updateGraphicsSettings();
    toggleSettings();
}

function animate() {
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 1000 / targetFPS);

    const delta = clock.getDelta();
    const speed = sprint ? 12 : 6;

    // Player movement
    if (moveForward) controls.moveForward(speed * delta);
    if (moveBackward) controls.moveForward(-speed * delta);
    if (moveLeft) controls.moveRight(-speed * delta);
    if (moveRight) controls.moveRight(speed * delta);

    // Bullet movement
    bullets.forEach((bullet, index) => {
        bullet.position.addScaledVector(bullet.velocity, delta);
        if (bullet.position.length() > 100) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });

    // Enemy movement
    enemies.forEach(enemy => {
        const direction = player.position.clone().sub(enemy.position).normalize();
        enemy.velocity.copy(direction.multiplyScalar(2));
        enemy.position.addScaledVector(enemy.velocity, delta);
    });

    renderer.render(scene, camera);
}

init();