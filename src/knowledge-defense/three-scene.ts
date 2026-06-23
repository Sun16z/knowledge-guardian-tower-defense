import * as THREE from 'three';
import { PATH_POINTS, TOWER_SLOTS, getEnemyType, getTowerType, type TowerTypeId } from './content';
import type { EnemyState, KnowledgeGameState, ShotEffect, TowerState } from './engine';

type SlotClickHandler = (slotId: string) => void;

const WORLD_SCALE = 60;
const FIELD_WIDTH = 980;
const FIELD_HEIGHT = 600;

interface EnemyRender {
  group: THREE.Group;
  hpFill: THREE.Mesh;
  lastHp: number;
  hitFlash: number;
}

interface TowerRender {
  group: THREE.Group;
  range: THREE.Mesh;
}

interface EffectRender {
  object: THREE.Object3D;
  initialTtl: number;
}

export class KnowledgeDefenseThreeScene {
  private readonly host: HTMLElement;
  private readonly onSlotClick: SlotClickHandler;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly projectedSlot = new THREE.Vector3();
  private readonly slotTargets: THREE.Object3D[] = [];
  private readonly slotBases = new Map<string, THREE.Mesh>();
  private readonly towerRenders = new Map<string, TowerRender>();
  private readonly enemyRenders = new Map<number, EnemyRender>();
  private readonly effectRenders = new Map<number, EffectRender>();
  private readonly reusableTarget = new THREE.Vector3(0, 0, 0);
  private readonly clock = new THREE.Clock();
  private width = 0;
  private height = 0;
  private disposed = false;

  constructor(host: HTMLElement, onSlotClick: SlotClickHandler) {
    this.host = host;
    this.onSlotClick = onSlotClick;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'battle-three-canvas';
    this.host.appendChild(this.renderer.domElement);

    this.setupCamera();
    this.setupLights();
    this.setupWorld();
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
  }

  render(state: KnowledgeGameState, selectedTowerType: string): void {
    if (this.disposed) return;
    this.resizeIfNeeded();
    this.updateSlots(selectedTowerType);
    this.updateTowers(state);
    this.updateEnemies(state.enemies);
    this.updateEffects(state.effects);

    const elapsed = this.clock.getElapsedTime();
    this.scene.getObjectByName('core-crystal')?.rotateY(0.012);
    this.camera.position.y = 10.2 + Math.sin(elapsed * 0.6) * 0.08;
    this.camera.lookAt(this.reusableTarget);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setupCamera(): void {
    this.camera.position.set(0, 10.2, 12.8);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights(): void {
    this.scene.background = new THREE.Color('#bfe3ff');
    this.scene.fog = new THREE.Fog('#bfe3ff', 15, 34);

    const hemi = new THREE.HemisphereLight('#f8fafc', '#4d7c0f', 2.1);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff7ed', 3.2);
    sun.position.set(-6, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);
  }

  private setupWorld(): void {
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(17.8, 0.72, 11.2),
      new THREE.MeshStandardMaterial({ color: '#84cc16', roughness: 0.82, metalness: 0.02 }),
    );
    island.position.y = -0.36;
    island.castShadow = false;
    island.receiveShadow = true;
    this.scene.add(island);

    const cliff = new THREE.Mesh(
      new THREE.BoxGeometry(18.2, 0.82, 11.6),
      new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.88 }),
    );
    cliff.position.y = -0.88;
    cliff.receiveShadow = true;
    this.scene.add(cliff);

    this.addRoad();
    this.addDecorations();
    this.addCore();
    this.addSlots();
  }

  private addRoad(): void {
    const segmentMaterial = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.74 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.86 });

    for (let index = 0; index < PATH_POINTS.length - 1; index += 1) {
      const start = toWorld(PATH_POINTS[index]);
      const end = toWorld(PATH_POINTS[index + 1]);
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const angle = -Math.atan2(dz, dx);

      const edge = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.08, 1.3), edgeMaterial);
      edge.position.set((start.x + end.x) / 2, 0.02, (start.z + end.z) / 2);
      edge.rotation.y = angle;
      edge.receiveShadow = true;
      this.scene.add(edge);

      const road = new THREE.Mesh(new THREE.BoxGeometry(length + 0.42, 0.12, 0.86), segmentMaterial);
      road.position.set((start.x + end.x) / 2, 0.08, (start.z + end.z) / 2);
      road.rotation.y = angle;
      road.receiveShadow = true;
      this.scene.add(road);

      const arrowCount = Math.max(1, Math.floor(length / 2.3));
      for (let arrowIndex = 1; arrowIndex <= arrowCount; arrowIndex += 1) {
        const ratio = arrowIndex / (arrowCount + 1);
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.34, 3),
          new THREE.MeshStandardMaterial({ color: '#fff7ed', roughness: 0.64, emissive: '#f59e0b', emissiveIntensity: 0.08 }),
        );
        arrow.position.set(start.x + dx * ratio, 0.19, start.z + dz * ratio);
        arrow.rotation.set(Math.PI / 2, 0, angle - Math.PI / 2);
        arrow.castShadow = false;
        arrow.receiveShadow = true;
        this.scene.add(arrow);
      }
    }

    const capMaterial = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.78 });
    for (const point of PATH_POINTS) {
      const world = toWorld(point);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 18), capMaterial);
      cap.position.set(world.x, 0.14, world.z);
      cap.receiveShadow = true;
      this.scene.add(cap);
    }
  }

  private addDecorations(): void {
    const colors = ['#22c55e', '#16a34a', '#0d9488', '#a3e635', '#38bdf8'];
    const positions = [
      [-6.8, -4.2],
      [-7.2, 3.8],
      [-4.8, 4.5],
      [-1.8, -4.6],
      [1.4, 4.7],
      [4.2, -4.2],
      [6.8, 4.1],
      [7.4, -2.6],
    ];

    positions.forEach(([x, z], index) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.45, 7),
        new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.86 }),
      );
      trunk.position.set(x, 0.34, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.36 + (index % 2) * 0.08, 0.72, 7),
        new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.72 }),
      );
      crown.position.set(x, 0.88, z);
      crown.castShadow = true;
      this.scene.add(crown);
    });

    const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 });
    for (const [x, z, scale] of [
      [-5.8, -5.2, 0.9],
      [0.8, -5.5, 0.7],
      [6.2, 5.2, 0.8],
    ]) {
      const cloud = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), cloudMaterial);
      cloud.position.set(x, 0.08, z);
      cloud.scale.y = 0.22;
      cloud.receiveShadow = true;
      this.scene.add(cloud);
    }
  }

  private addCore(): void {
    const corePoint = toWorld({ x: 930, y: 354 });
    const group = new THREE.Group();
    group.position.set(corePoint.x, 0.22, corePoint.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.78, 0.38, 6),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.55 }),
    );
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const library = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.72, 0.62),
      new THREE.MeshStandardMaterial({ color: '#ccfbf1', roughness: 0.58 }),
    );
    library.position.y = 0.5;
    library.castShadow = true;
    group.add(library);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.78, 0.54, 4),
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6 }),
    );
    roof.position.y = 1.08;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: '#67e8f9', emissive: '#0e7490', emissiveIntensity: 0.9, roughness: 0.25 }),
    );
    crystal.name = 'core-crystal';
    crystal.position.y = 1.56;
    crystal.castShadow = true;
    group.add(crystal);

    const light = new THREE.PointLight('#67e8f9', 3.2, 6);
    light.position.y = 1.45;
    group.add(light);
    this.scene.add(group);
  }

  private addSlots(): void {
    const ringMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.64, transparent: true, opacity: 0.78 });
    const emptyMaterial = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.72 });

    for (const slot of TOWER_SLOTS) {
      const world = toWorld(slot);
      const group = new THREE.Group();
      group.position.set(world.x, 0.16, world.z);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.18, 24), ringMaterial.clone());
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.slotId = slot.id;
      group.add(base);
      this.slotTargets.push(base);
      this.slotBases.set(slot.id, base);

      const marker = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 8, 18), emptyMaterial);
      marker.rotation.x = Math.PI / 2;
      marker.position.y = 0.12;
      marker.userData.slotId = slot.id;
      group.add(marker);
      this.slotTargets.push(marker);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.24, 10),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.42, emissive: '#ffffff', emissiveIntensity: 0.18 }),
      );
      beacon.position.y = 0.27;
      beacon.userData.slotId = slot.id;
      group.add(beacon);
      this.slotTargets.push(beacon);

      this.scene.add(group);
    }
  }

  private updateSlots(selectedTowerType: string): void {
    const selected = getTowerType(selectedTowerType as TowerTypeId);
    for (const [slotId, base] of this.slotBases) {
      const occupied = this.towerRenders.has(slotId);
      const material = base.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.set(occupied ? '#ecfeff' : selected.light);
        material.emissive.set(occupied ? '#000000' : selected.color);
        material.emissiveIntensity = occupied ? 0 : 0.08;
      }
    }
  }

  private updateTowers(state: KnowledgeGameState): void {
    const towers = state.towers;
    const active = new Set(towers.map((tower) => tower.slotId));
    for (const [slotId, render] of this.towerRenders) {
      if (!active.has(slotId)) {
        this.scene.remove(render.group);
        disposeObject(render.group);
        this.towerRenders.delete(slotId);
      }
    }

    for (const tower of towers) {
      let render = this.towerRenders.get(tower.slotId);
      if (!render) {
        render = this.createTower(tower);
        this.towerRenders.set(tower.slotId, render);
        this.scene.add(render.group);
      }
      const towerType = getTowerType(tower.typeId);
      const boosted = state.subjectBoosts[towerType.subject] > 0;
      render.group.scale.setScalar(1 + (tower.level - 1) * 0.13);
      const head = render.group.getObjectByName('tower-head') as THREE.Mesh | undefined;
      if (head) {
        head.rotation.y += boosted ? 0.08 : 0.04 + tower.level * 0.006;
        if (head.material instanceof THREE.MeshStandardMaterial) {
          head.material.emissiveIntensity = boosted ? 0.42 : 0.08;
        }
      }
      const light = render.group.getObjectByName('tower-light') as THREE.PointLight | undefined;
      if (light) light.intensity = boosted ? 1.15 : 0.48;
      render.range.scale.setScalar(towerType.range / 60);
      render.range.visible = boosted || tower.level >= 2;
      if (render.range.material instanceof THREE.MeshBasicMaterial) {
        render.range.material.opacity = boosted ? 0.18 : 0.1;
      }
    }
  }

  private createTower(tower: TowerState): TowerRender {
    const slot = TOWER_SLOTS.find((item) => item.id === tower.slotId) ?? TOWER_SLOTS[0];
    const towerType = getTowerType(tower.typeId);
    const world = toWorld(slot);
    const group = new THREE.Group();
    group.position.set(world.x, 0.32, world.z);

    const material = new THREE.MeshStandardMaterial({
      color: towerType.color,
      roughness: 0.52,
      metalness: 0.06,
      emissive: towerType.color,
      emissiveIntensity: 0.08,
    });
    const lightMaterial = new THREE.MeshStandardMaterial({ color: towerType.light, roughness: 0.6 });

    const range = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.018, 40),
      new THREE.MeshBasicMaterial({ color: towerType.color, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    range.position.y = 0.018;
    group.add(range);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.76, 6), lightMaterial);
    body.position.y = 0.44;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const headGeometry =
      tower.typeId === 'number'
        ? new THREE.BoxGeometry(0.55, 0.38, 0.55)
        : tower.typeId === 'word'
          ? new THREE.ConeGeometry(0.38, 0.58, 5)
          : tower.typeId === 'nature'
            ? new THREE.OctahedronGeometry(0.38, 0)
            : new THREE.DodecahedronGeometry(0.4, 0);
    const head = new THREE.Mesh(headGeometry, material);
    head.name = 'tower-head';
    head.position.y = 0.96;
    head.castShadow = true;
    group.add(head);

    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: towerType.light, emissiveIntensity: 0.42, roughness: 0.28 }),
    );
    gem.position.set(0, 1.22, 0);
    group.add(gem);

    const pointLight = new THREE.PointLight(towerType.color, 0.48, 2.5);
    pointLight.name = 'tower-light';
    pointLight.position.y = 1.1;
    group.add(pointLight);

    return { group, range };
  }

  private updateEnemies(enemies: EnemyState[]): void {
    const active = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, render] of this.enemyRenders) {
      if (!active.has(id)) {
        this.scene.remove(render.group);
        disposeObject(render.group);
        this.enemyRenders.delete(id);
      }
    }

    const elapsed = this.clock.getElapsedTime();
    for (const enemy of enemies) {
      let render = this.enemyRenders.get(enemy.id);
      if (!render) {
        render = this.createEnemy(enemy);
        this.enemyRenders.set(enemy.id, render);
        this.scene.add(render.group);
      }
      const point = pointAtEnemyProgress(enemy.progress);
      if (enemy.hp < render.lastHp) {
        render.hitFlash = 0.22;
      }
      render.lastHp = enemy.hp;
      render.hitFlash = Math.max(0, render.hitFlash - 0.045);
      const hitPulse = render.hitFlash > 0 ? 1 + render.hitFlash * 0.42 : 1;
      render.group.position.set(point.x, 0.54 + Math.sin(elapsed * 5 + enemy.id) * 0.04 + render.hitFlash * 0.08, point.z);
      render.group.rotation.y += enemy.typeId === 'clock' ? 0.06 : 0.025;
      render.group.scale.setScalar((enemy.typeId === 'blank' ? 1.15 : 1) * hitPulse);
      render.hpFill.scale.x = Math.max(0.02, enemy.hp / enemy.maxHp);
      const body = render.group.getObjectByName('enemy-body') as THREE.Mesh | undefined;
      const enemyType = getEnemyType(enemy.typeId);
      if (body?.material instanceof THREE.MeshStandardMaterial) {
        body.material.color.set(enemy.slowTimer > 0 ? enemyType.light : enemyType.color);
        body.material.emissive.set(render.hitFlash > 0 ? '#fff7ed' : '#000000');
        body.material.emissiveIntensity = render.hitFlash > 0 ? 0.7 : 0;
      }
    }
  }

  private createEnemy(enemy: EnemyState): EnemyRender {
    const enemyType = getEnemyType(enemy.typeId);
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: enemyType.color,
      roughness: 0.6,
      metalness: 0.02,
    });

    const geometry =
      enemy.typeId === 'blank'
        ? new THREE.BoxGeometry(0.72, 0.72, 0.72)
        : enemy.typeId === 'clock'
          ? new THREE.OctahedronGeometry(0.48, 0)
          : new THREE.DodecahedronGeometry(enemy.typeId === 'careless' ? 0.52 : 0.46, 0);
    const body = new THREE.Mesh(geometry, material);
    body.name = 'enemy-body';
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#ffffff', emissiveIntensity: 0.2 });
    for (const x of [-0.16, 0.16]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeMaterial);
      eye.position.set(x, 0.14, 0.39);
      group.add(eye);
    }

    const hpBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.055, 0.045), new THREE.MeshBasicMaterial({ color: '#e2e8f0' }));
    hpBack.position.set(0, 0.66, 0.04);
    group.add(hpBack);
    const hpFill = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: '#22c55e' }));
    hpFill.position.set(0, 0.665, 0.08);
    group.add(hpFill);

    return { group, hpFill, lastHp: enemy.hp, hitFlash: 0 };
  }

  private updateEffects(effects: ShotEffect[]): void {
    const active = new Set(effects.map((effect) => effect.id));
    for (const [id, render] of this.effectRenders) {
      if (!active.has(id)) {
        this.scene.remove(render.object);
        disposeObject(render.object);
        this.effectRenders.delete(id);
      }
    }

    for (const effect of effects) {
      let render = this.effectRenders.get(effect.id);
      if (!render) {
        render = { object: this.createEffect(effect), initialTtl: effect.ttl };
        this.effectRenders.set(effect.id, render);
        this.scene.add(render.object);
      }
      const progress = Math.max(0, Math.min(1, 1 - effect.ttl / render.initialTtl));
      const opacity = Math.max(0.08, 1 - progress);
      render.object.traverse((object) => {
        if (object instanceof THREE.Line || object instanceof THREE.Mesh) {
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => {
              item.transparent = true;
              item.opacity = opacity;
            });
          } else {
            material.transparent = true;
            material.opacity = opacity;
          }
        }
      });
      if (effect.kind === 'splash') {
        render.object.scale.setScalar(0.45 + progress * 2.1);
      } else {
        render.object.scale.setScalar(1 + progress * 0.18);
      }
    }
  }

  private createEffect(effect: ShotEffect): THREE.Object3D {
    const color = new THREE.Color(effect.color);
    const group = new THREE.Group();
    if (effect.kind === 'splash') {
      const point = toWorld(effect.to);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.035, 8, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false }),
      );
      ring.position.set(point.x, 0.2, point.z);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const wave = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.68, 0.08, 32, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      );
      wave.position.set(point.x, 0.28, point.z);
      group.add(wave);

      for (let index = 0; index < 10; index += 1) {
        const angle = (Math.PI * 2 * index) / 10;
        const shard = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.08 + (index % 3) * 0.025, 0),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
        );
        shard.position.set(point.x + Math.cos(angle) * 0.42, 0.35 + (index % 2) * 0.12, point.z + Math.sin(angle) * 0.42);
        shard.rotation.set(angle, angle * 0.4, angle * 0.7);
        group.add(shard);
      }
      return group;
    }

    const from = toWorld(effect.from);
    const to = toWorld(effect.to);
    const start = new THREE.Vector3(from.x, 1.05, from.z);
    const end = new THREE.Vector3(to.x, 0.72, to.z);
    const beamMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: effect.kind === 'slow' ? 0.58 : 0.76 });
    group.add(makeCylinderBetween(start, end, effect.kind === 'slow' ? 0.026 : 0.034, beamMaterial));

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(effect.kind === 'slow' ? 0.14 : 0.18, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 }),
    );
    core.position.copy(end);
    group.add(core);

    const sparkCount = effect.kind === 'slow' ? 7 : 6;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount;
      const radius = effect.kind === 'slow' ? 0.26 : 0.2;
      const spark = new THREE.Mesh(
        effect.kind === 'slow' ? new THREE.ConeGeometry(0.035, 0.22, 5) : new THREE.TetrahedronGeometry(0.07, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74 }),
      );
      spark.position.set(end.x + Math.cos(angle) * radius, end.y + 0.03 + (index % 2) * 0.08, end.z + Math.sin(angle) * radius);
      spark.rotation.set(angle * 0.3, angle, angle * 0.7);
      group.add(spark);
    }

    if (effect.kind === 'slow') {
      const frost = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.018, 8, 32),
        new THREE.MeshBasicMaterial({ color: '#cffafe', transparent: true, opacity: 0.58 }),
      );
      frost.position.set(end.x, 0.28, end.z);
      frost.rotation.x = Math.PI / 2;
      group.add(frost);
    }

    const light = new THREE.PointLight(color, effect.kind === 'slow' ? 1.3 : 1.8, 3.2);
    light.position.copy(end);
    group.add(light);
    return group;
  }

  private resizeIfNeeded(): void {
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.slotTargets, false)[0];
    const slotId = hit?.object.userData.slotId;
    if (typeof slotId === 'string') {
      this.onSlotClick(slotId);
      return;
    }

    let nearestSlotId = '';
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const slot of TOWER_SLOTS) {
      const world = toWorld(slot);
      this.projectedSlot.set(world.x, 0.22, world.z).project(this.camera);
      const screenX = ((this.projectedSlot.x + 1) / 2) * rect.width;
      const screenY = ((-this.projectedSlot.y + 1) / 2) * rect.height;
      const dx = event.clientX - rect.left - screenX;
      const dy = event.clientY - rect.top - screenY;
      const distance = Math.hypot(dx, dy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSlotId = slot.id;
      }
    }
    if (nearestDistance <= 56 && nearestSlotId) {
      this.onSlotClick(nearestSlotId);
    }
  };
}

function toWorld(point: { x: number; y: number }): THREE.Vector3 {
  return new THREE.Vector3((point.x - FIELD_WIDTH / 2) / WORLD_SCALE, 0, (point.y - FIELD_HEIGHT / 2) / WORLD_SCALE);
}

function pointAtEnemyProgress(progress: number): THREE.Vector3 {
  const segmentLengths = PATH_POINTS.slice(1).map((point, index) => {
    const previous = PATH_POINTS[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  let remaining = Math.max(0, progress);
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    if (remaining <= length) {
      const start = PATH_POINTS[index];
      const end = PATH_POINTS[index + 1];
      const ratio = length === 0 ? 0 : remaining / length;
      return toWorld({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      });
    }
    remaining -= length;
  }
  return toWorld(PATH_POINTS[PATH_POINTS.length - 1]);
}

function makeCylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(length, 0.001), 10), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry?.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material?.dispose();
      }
    }
  });
}
