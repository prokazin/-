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
startTimer();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Создание кубиков
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) continue;

                const materials = [];
                materials.push(x === 1 ? new THREE.MeshPhongMaterial({ color: colors.red }) : new THREE.MeshPhongMaterial({ color: colors.black }));
                materials.push(x === -1 ? new THREE.MeshPhongMaterial({ color: colors.orange }) : new THREE.MeshPhongMaterial({ color: colors.black }));
                materials.push(y === 1 ? new THREE.MeshPhongMaterial({ color: colors.white }) : new THREE.MeshPhongMaterial({ color: colors.black }));
                materials.push(y === -1 ? new THREE.MeshPhongMaterial({ color: colors.yellow }) : new THREE.MeshPhongMaterial({ color: colors.black }));
                materials.push(z === 1 ? new THREE.MeshPhongMaterial({ color: colors.green }) : new THREE.MeshPhongMaterial({ color: colors.black }));
                materials.push(z === -1 ? new THREE.MeshPhongMaterial({ color: colors.blue }) : new THREE.MeshPhongMaterial({ color: colors.black }));

                const geometry = new THREE.BoxGeometry(size, size, size);
                const cubelet = new THREE.Mesh(geometry, materials);
                cubelet.position.set(x * size, y * size, z * size);
                scene.add(cubelet);
                cube.push(cubelet);
            }
    }

    // Обработка ресайза
    window.addEventListener('resize', onWindowResize);

    // Кнопки
    document.getElementById('scramble').onclick = scramble;
    document.getElementById('reset').onclick = resetCube;
    document.getElementById('fullscreen').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
    };
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

function rotateLayer(axis, index, direction = 1) {
    const group = new THREE.Group();
    cube.forEach(c => {
        if (Math.round(c.position[axis]) === index) {
            scene.remove(c);
            group.add(c);
        }
    });
    scene.add(group);

    const angle = direction * Math.PI / 2;
    const tween = new TWEEN.Tween({ rot: 0 })
        .to({ rot: angle }, 300)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(obj => {
            group.rotation[axis] = obj.rot;
        })
        .onComplete(() => {
            group.children.forEach(c => {
                group.remove(c);
                c.position.applyAxisAngle(new THREE.Vector3(...[0,0,0].map((_,i)=> i===parseInt(axis)?1:0)), angle);
                c.rotation[axis] += angle;
                scene.add(c);
            });
            scene.remove(group);
            moves++;
            document.getElementById('moves').textContent = moves;
        })
        .start();
}

// Touch/мышь для поворота граней (упрощённый raycaster)
let startX, startY;
renderer.domElement.addEventListener('pointerdown', e => {
    startX = e.clientX;
    startY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', e => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // не клик

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cube);
    if (intersects.length > 0) {
        const pos = intersects[0].object.position;
        if (Math.abs(dx) > Math.abs(dy)) {
            // горизонтальный свайп
            rotateLayer('y', Math.round(pos.y), dx > 0 ? 1 : -1);
        } else {
            // вертикальный свайп
            rotateLayer('x', Math.round(pos.x), dy > 0 ? -1 : 1);
        }
    }
});

function scramble() {
    moves = 0;
    document.getElementById('moves').textContent = 0;
    const movesCount = 20;
    for (let i = 0; i < movesCount; i++) {
        const axis = ['x','y','z'][Math.floor(Math.random()*3)];
        const index = [-1,0,1][Math.floor(Math.random()*3)];
        const dir = Math.random() > 0.5 ? 1 : -1;
        setTimeout(() => rotateLayer(axis, index, dir), i * 100);
    }
}

function resetCube() {
    location.reload(); // простой сброс
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const sec = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('time').textContent = `${min}:${sec}`;
    }, 500);
}

// TWEEN для анимации (встроен в примеры Three.js, но добавим простой)
const TWEEN = {
    Easing: { Cubic: { Out: t => 1 - Math.pow(1 - t, 3) } },
    Tween: function(obj) {
        this._object = obj;
        this._startTime = Date.now();
        this._duration = 0;
        this._to = {};
        this._onUpdate = null;
        this._onComplete = null;
        return this;
    }
};
TWEEN.Tween.prototype.to = function(to, duration) { this._to = to; this._duration = duration; return this; };
TWEEN.Tween.prototype.easing = function() { return this; };
TWEEN.Tween.prototype.onUpdate = function(cb) { this._onUpdate = cb; return this; };
TWEEN.Tween.prototype.onComplete = function(cb) { this._onComplete = cb; return this; };
TWEEN.Tween.prototype.start = function() {
    this._start = { ...this._object };
    const update = () => {
        const time = Math.min((Date.now() - this._startTime) / this._duration, 1);
        if (time >= 1) {
            Object.assign(this._object, this._to);
            if (this._onUpdate) this._onUpdate(this._object);
            if (this._onComplete) this._onComplete();
        } else {
            for (let key in this._to) {
                this._object[key] = this._start[key] + (this._to[key] - this._start[key]) * time; // linear для простоты
            }
            if (this._onUpdate) this._onUpdate(this._object);
            requestAnimationFrame(update);
        }
    };
    update();
};
