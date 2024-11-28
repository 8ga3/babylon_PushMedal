// Description: メダル落としゲームのサンプル
// Playground: https://playground.babylonjs.com/#579QOL#5
//
// Android ChromeとMeta Quest Browserでは、 chrome://flags でWebXRの設定を有効にする必要があります
// WebXRの設定が有効になっている場合、WebXRの設定を使ってARモードで実行できます
// WebXRの設定が無効の場合、通常の3Dモードで実行されます

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// HavokPhysicsの読み込み
const enablePhysics = async (scene) => {
    const havokInstance = await HavokPhysics();
    const hk = new BABYLON.HavokPlugin(true, havokInstance);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);
};

// Stageの作成
const createStage = (scene, shadowGenerator) => {
    const material = new BABYLON.StandardMaterial("stage", scene);
    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);

    const housing= BABYLON.MeshBuilder.CreateBox("housing", {height: 0.05, width: 0.6, depth: 0.37}, scene);
    housing.position.y = -0.035;
    housing.material = material;
    housing.receiveShadows = true;

    const floor = BABYLON.MeshBuilder.CreateBox("floor", {height: 0.01, width: 0.5, depth: 0.37}, scene);
    floor.position.y = -0.005;
    floor.material = material;
    floor.receiveShadows = true;
    new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0, friction:0.01 }, scene);

    const createWall = (name, options, position, rotation = 0) => {
        const wall = BABYLON.MeshBuilder.CreateBox(name, options, scene);
        wall.position = position;
        wall.rotatePOV(0, rotation, 0);
        wall.material = material;
        wall.receiveShadows = true;
        shadowGenerator.getShadowMap().renderList.push(wall);
        new BABYLON.PhysicsAggregate(wall, BABYLON.PhysicsShapeType.BOX, { mass: 0, friction:0.1 }, scene);
        return wall;
    }

    createWall("wall_center", {height: 0.1, width: 0.11, depth: 0.02}, new BABYLON.Vector3(0, 0.08, 0.08));
    createWall("wall_left1", {height: 0.05, width: 0.01, depth: 0.2}, new BABYLON.Vector3(0.06, 0.025, 0.1));
    createWall("wall_left2", {height: 0.05, width: 0.01, depth: 0.2}, new BABYLON.Vector3(0.1051, 0.025, -0.0882), - Math.PI * 25 / 180);
    createWall("wall_right1", {height: 0.05, width: 0.01, depth: 0.2}, new BABYLON.Vector3(-0.06, 0.025, 0.1));
    createWall("wall_right2", {height: 0.05, width: 0.01, depth: 0.2}, new BABYLON.Vector3(-0.1051, 0.025, -0.0882), Math.PI * 25 / 180);
};

// Skyboxの作成
const createSkybox = (scene) => {
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000}, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
	skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
};

// pusherの作成
const createPusher = (scene) => {
    const material = new BABYLON.StandardMaterial("pusher", scene);
    material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.4);

    const pusher = BABYLON.MeshBuilder.CreateBox(
        "pusher",
        {height: 0.03, width: 0.11, depth: 0.1},
        scene
    );
    pusher.position.y = 0.015;
    pusher.position.z = 0.05;
    pusher.material = material;
    pusher.receiveShadows = true;
    const pusherShape = new BABYLON.PhysicsShapeBox(
        new BABYLON.Vector3(0, 0, 0),
        BABYLON.Quaternion.Identity(),
        new BABYLON.Vector3(0.11, 0.03, 0.12), // メダルの直径の分だけ大きめ
        scene
    );
    const pusherBody = new BABYLON.PhysicsBody(
        pusher,
        BABYLON.PhysicsMotionType.DYNAMIC,
        false,
        scene
    );
    pusherShape.material = { friction: 0.1, restitution: 0.1 };
    pusherBody.shape = pusherShape;
    pusherBody.disablePreStep = false; // これをしないと物理演算がおかしくなる
    pusherBody.setMassProperties({mass: 10});

    // Meshと同じサイズのShapeならこちらでもOK
    // const physicsAggregate = new BABYLON.PhysicsAggregate(pusher, BABYLON.PhysicsShapeType.BOX, { mass: 1, restitution: 0.1, friction: 0.1 }, scene);
    // physicsAggregate.body.disablePreStep = false;

    const animationPusher = new BABYLON.Animation("torusEasingAnimation",
        "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const easingFunction = new BABYLON.SineEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    // Animation keys
    const nextPos = pusher.position.add(new BABYLON.Vector3(0, 0, 0.12 - 0.05));

    const keysPusher = [];
    keysPusher.push({ frame: 0,   value: pusher.position, easingFunction: easingFunction });
    keysPusher.push({ frame: 120, value: nextPos,         easingFunction: easingFunction });
    keysPusher.push({ frame: 240, value: pusher.position });
    animationPusher.setKeys(keysPusher);

    scene.beginDirectAnimation(pusher, [animationPusher], 0, 240, true);
};

// GUIパネルの作成
const createPanel = (scene) => {
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

    const panel = new BABYLON.GUI.StackPanel("ScorePanel");
    panel.width = "260px";
    panel.height = "80px";
    panel.left = "20px";
    panel.top = "20px";
    panel.color = "white";
    panel.fontSize = "36px";
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(panel);

    const textInsert = new BABYLON.GUI.TextBlock("textInsert");
    textInsert.text = "Insert: 0";
    textInsert.height = "40px";
    textInsert.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(textInsert);

    const textScore = new BABYLON.GUI.TextBlock("textScore");
    textScore.text = "Score: 0";
    textScore.height = "40px";
    textScore.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(textScore);

    return [textInsert, textScore];
};

// (min, max)の範囲の乱数を生成
const randomNumber = (min, max) => {
    if (min == max) {
        return (min);
    }
    const random = Math.random();
    return ((random * (max - min)) + min);
};

// メダルのメッシュ作成
const makeMedalMesh = (name, scene) => {
    const material = new BABYLON.PBRMaterial("medal", scene);
    material.metallic = 1.0;
    material.roughness = 0.4;
    material.forceIrradianceInFragment = true;
    material.albedoColor = new BABYLON.Color3(0.972, 0.960, 0.915);
    material.bumpTexture = new BABYLON.Texture("textures/rockn.png", scene);

    const faceUV = [];
    faceUV[0] = new BABYLON.Vector4(0, 0, 1.00, 1);
    faceUV[1] =	new BABYLON.Vector4(1, 0, 0.32, 1);
    faceUV[2] = new BABYLON.Vector4(0, 0, 1.00, 1);

    mesh = BABYLON.MeshBuilder.CreateCylinder(name, {height:0.003, diameter:0.02, faceUV: faceUV}, scene);
    mesh.material = material;
    return mesh;
};

// 初期メダルの生成
const makeInitialMedals = (num, orgMedal, parentNode, shadowGenerator, scene) => {
    const medals = [];
    const spawnPosition = new BABYLON.Vector3(0, 0.01, -0.08);

    const getRandomPosition = () => {
        return new BABYLON.Vector3(randomNumber(-0.03, 0.03), randomNumber(-0.008, 0.012), randomNumber(-0.03, 0.03));
    };

    for (let i = 0; i < num; i++) {
        const medal = orgMedal.createInstance("medal" + i);
        const pos = getRandomPosition();
        medal.position.x = spawnPosition.x + pos.x;
        medal.position.y = spawnPosition.y + pos.y;
        medal.position.z = spawnPosition.z + pos.z;
        medal.parent = parentNode;
        shadowGenerator.getShadowMap().renderList.push(medal);
        new BABYLON.PhysicsAggregate(medal, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0.02, friction:0.01, restitution:0.1 }, scene);
        medals.push(medal);
    }

    return medals
};

// メダルの生成
const createMedal = (count, orgMedal, parentNode, shadowGenerator, scene) => {
    const medal = orgMedal.createInstance("medal"+count);
    medal.position.x = randomNumber(-0.03, 0.03);
    medal.position.y = 0.22;
    medal.position.z = 0.05;
    medal.rotatePOV(Math.PI / 2, 0, 0);
    medal.parent = parentNode;
    shadowGenerator.getShadowMap().renderList.push(medal);
    new BABYLON.PhysicsAggregate(medal, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0.02, friction:0.01, restitution:0.1 }, scene);
    return medal;
};

// シーンの作成
const createScene = async () => {
    const scene = new BABYLON.Scene(engine);

    const camera = new BABYLON.ArcRotateCamera("camera", - Math.PI / 2, Math.PI * 70 / 180, 0.5, BABYLON.Vector3.Zero(), scene);
    camera.minZ = 0.01;
    camera.wheelPrecision = 1000;
    camera.attachControl(canvas, true);

    const lightHemi = new BABYLON.HemisphericLight("lighthemi", new BABYLON.Vector3(0.5, 1, 0), scene);
	const lightDir = new BABYLON.DirectionalLight("lightdir", new BABYLON.Vector3(-1, -2, 2), scene);
	lightDir.intensity = 0.3;

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, lightDir);
    shadowGenerator.useExponentialShadowMap = true;

    // WebXRの設定
    try {
        // HTTPSが必要
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
                referenceSpaceType: "local-floor",
                onError: (error) => {
                    alert(error);
                }
            },
            optionalFeatures: true
        });

        //Hide skyBox in AR mode
        xrHelper.baseExperience.sessionManager.onXRSessionInit.add(() => {
            const mesh = scene.getMeshByName("skyBox");
            mesh.isVisible = false;
        })
        xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => {
            const mesh = scene.getMeshByName("skyBox");
            mesh.isVisible = true;
        })
    } catch (e) {
        console.log(e);
    }

    await enablePhysics(scene);
    createSkybox(scene);
    createStage(scene, shadowGenerator);
    createPusher(scene);

    const [textInsert, textScore] = createPanel(scene);
    const updateTextInsert = function (newText) { textInsert.text = newText; };
    const updateScoreInsert = function (newText) { textScore.text = newText; };
    updateTextInsert("Insert: 0");


    const initMedals = 100;
    let insertMedals = 0;
    let scoreMedals = 0;
    let insertMedalWaitTime = 0;

    // 生成したメダルを格納するノード
    const medalsNode = new BABYLON.TransformNode("MedalsNode", scene);

    // orgMedalをcreateInstanceする
    const orgMedal = makeMedalMesh("medal_org", scene);
    orgMedal.parent = medalsNode;
    orgMedal.isVisible = false; // 非表示

    // 初期メダルを生成
    const medals = makeInitialMedals(initMedals, orgMedal, medalsNode, shadowGenerator, scene);

    scene.onBeforeRenderObservable.add(() => {
        // 落ちたメダルを削除
        medals.map((mesh, key, arr) => {
            if (mesh.position.y < -0.5) {
                mesh.dispose();
                arr.splice(key, 1);
                scoreMedals++;
                updateScoreInsert("Score: " + scoreMedals * 10);
            }
        });

        // メダルを生成
        const deltaTime = engine.getDeltaTime();
        insertMedalWaitTime += deltaTime;
        if (insertMedalWaitTime >= 3000) { // 3秒ごとにメダルを生成
            insertMedalWaitTime = 0;
            const newMedal = createMedal(initMedals + insertMedals, orgMedal, medalsNode, shadowGenerator, scene);
            medals.push(newMedal);
            insertMedals++;
            updateTextInsert("Insert: " + insertMedals * 10);
        }
    });

    return scene;
};

// シーンの作成とレンダリング
createScene().then((scene) => {
    scene.debugLayer.show();
    engine.runRenderLoop(function () {
        if (scene) {
            scene.render();
        }
    });
});

// ウィンドウリサイズ時の処理
window.addEventListener("resize", () => { engine.resize(); });
