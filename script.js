let scene, camera, renderer, controls;
let cube = [];
let moves = 0;
let startTime;
let timerInterval;

const size = 1;
const colors = {
    white: 0xffffff,
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    green: 0x00ff00,
    blue: 0x0000ff,
    black: 0x111111
};

init();
animate();
resetTimer();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);

    renderer = new THREE.WebGLRenderer({ antialias: false }); // false для мобильных
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.0;

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Создание кубиков (26 штук)
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) continue;

                const materials = [
                    new THREE.MeshPhongMaterial({ color: x === 1 ? colors.red : colors.black }),    // +X red
                    new THREE.MeshPhongMaterial({ color: x === -1 ? colors.orange : colors.black }), // -X orange
                    new THREE.MeshPhongMaterial({ color: y === 1 ? colors.white : colors.black }),   // +Y white
                    new THREE.MeshPhongMaterial({ color: y === -1 ? colors.yellow : colors.black }), // -Y yellow
                    new THREE.MeshPhongMaterial({ color: z === 1 ? colors.green : colors.black }),   // +Z green
                    new THREE.MeshPhongMaterial({ color: z === -1 ? colors.blue : colors.black })    // -Z blue
                ];

                const geometry = new THREE.BoxGeometry(size * 0.95, size * 0.95, size * 0.95); // Чуть меньше для швов
                const cubelet = new THREE.Mesh(geometry, materials);
                cubelet.position.set(x * size, y * size, z * size);
                scene.add(cubelet);
                cube.push(cubelet);
            }
        }
    }

    // Ресайз
    window.addEventListener('resize', onWindowResize);

    // Кнопки
    document.getElementById('scramble').onclick = scramble;
    document.getElementById('reset').onclick = resetCube;
    document.getElementById('fullscreen').onclick = toggleFullscreen;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function getLayerPos(mesh, axis) {
    const pos = mesh.position;
    switch (axis) {
        case 'x': return Math.round(pos.x);
        case 'y': return Math.round(pos.y);
        case 'z': return Math.round(pos.z);
    }
    return 0;
}

function getAxisVector(axis) {
    switch (axis) {
        case 'x': return new THREE.Vector3(1, 0, 0);
        case 'y': return new THREE.Vector3(0, 1, 0);
        case 'z': return new THREE.Vector3(0, 0, 1);
    }
    return new THREE.Vector3(0, 0, 0);
}

function rotateLayer(axis, index, direction = 1) {
    const group = new THREE.Group();
    cube.forEach(c => {
        if (getLayerPos(c, axis) === index) {
            scene.remove(c);
            group.add(c);
        }
    });
    if (group.children.length === 0) return;
    scene.add(group);

    const angle = direction * Math.PI / 2;
    const tweenObj = { rot: 0 };
    new TWEEN.Tween(tweenObj)
        .to({ rot: angle }, 400)
        .onUpdate(() => {
            group.rotation[axis] = tweenObj.rot;
        })
        .onComplete(() => {
            const axisVec = getAxisVector(axis);
            group.children.forEach(c => {
                group.remove(c);
                c.position.applyAxisAngle(axisVec, angle);
                c.rotation[axis] += angle;
                scene.add(c);
            });
            scene.remove(group);
            moves++;
            document.getElementById('moves').textContent = moves;
        })
        .start();
}

// Свайпы для поворота граней
let startX, startY;
renderer.domElement.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;

    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cube);
    if (intersects.length === 0) return;

    const pos = intersects[0].object.position;
    if (Math.abs(dx) > Math.abs(dy)) {
        // Горизонтальный свайп -> слой Y
        rotateLayer('y', getLayerPos(intersects[0].object, 'y'), dx > 0 ? -1 : 1);
    } else {
        // Вертикальный свайп -> слой X
        rotateLayer('x', getLayerPos(intersects[0].object, 'x'), dy > 0 ? 1 : -1);
    }
});

function scramble() {
    resetCube();
    const movesCount = 25;
    let delay = 0;
    for (let i = 0; i < movesCount; i++) {
        const axes = ['x', 'y', 'z'];
        const axis = axes[Math.floor(Math.random() * 3)];
        const indices = [-1, 0, 1];
        const index = indices[Math.floor(Math.random() * 3)];
        const dir = Math.random() > 0.5 ? 1 : -1;
        setTimeout(() => rotateLayer(axis, index, dir), delay);
        delay += 150; // Последовательный скрэмбл без сильных оверлеев
    }
}

function resetCube() {
    cube.forEach(c => {
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        c.rotation.set(0, 0, 0);
    });
    moves = 0;
    document.getElementById('moves').textContent = 0;
    resetTimer();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('time').textContent = `${mins}:${secs}`;
}

// Исправленный кастомный TWEEN (с easing и правильным timing)
const TWEEN = {
    Tween: function (object) {
        this._object = object;
        this._duration = 0;
        this._to = {};
        this._onUpdate = null;
        this._onComplete = null;
        return this;
    }
};

TWEEN.Tween.prototype = {
    to: function (to, duration) {
        this._to = to;
        this._duration = duration;
        return this;
    },
    onUpdate: function (cb) {
        this._onUpdate = cb;
        return this;
    },
    onComplete: function (cb) {
        this._onComplete = cb;
        return this;
    },
    start: function () {
        this._startTime = Date.now();
        this._start = { ...this._object };

        const update = () => {
            const elapsed = Date.now() - this._startTime;
            let time = Math.min(elapsed / this._duration, 1);
            const eased = 1 - Math.pow(1 - time, 3); // Cubic.Out

            if (time >= 1) {
                Object.assign(this._object, this._to);
                if (this._onUpdate) this._onUpdate(this._object);
                if (this._onComplete) this._onComplete();
                return;
            }

            for (let key in this._to) {
                this._object[key] = this._start[key] + (this._to[key] - this._start[key]) * eased;
            }
            if (this._onUpdate) this._onUpdate(this._object);
            requestAnimationFrame(update);
        };
        update();
    }
};
