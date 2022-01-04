// mouse & keyboard status
var mouseLastX, mouseLastY;
var mouseDragging = false;

// render image parameter
var angleX = 0, angleY = 0;
var scale = 1.5;
var tank_x = 3.0;
var tank_y = 0.0;
var direction = 0.0;
var vertical = 0.0;

// offscreen setting parameters
var new_view_dir;
var shaderMode = 'on';
var offScreenWidth = 800, offScreenHeight = 800;
var offCameraX = 0, offCameraY = 5, offCameraZ = 5;      // offscreen veiw position
var offCameraDirX = 0, offCameraDirY = -1, offCameraDirZ = -1;   // offscreen view direction

// render demanded matrix
var gl, canvas, reflectBall;

var camera = {
    War: {
        pos_x: 0,
        pos_y: 3,
        pos_z: 15,
        dir_x: 0,
        dir_y: 0,
        dir_z: -1,
    },
    Outspace: {
        pos_x: 0,
        pos_y: -16,
        pos_z: 38,
        dir_x: 0,
        dir_y: 16,
        dir_z: -38,
    },
}

var perspective = true;
var steve_view = {};
var current_screen = 'War';
var current_pers = camera[current_screen];

// image name and object
var textures = {};                                      // texture object
var imgNames = [                                        // define image name
    "Steve.png",
    "trump.png",
    "151_norm.jpg",
    "184_norm.jpg",
    "spstob_1.jpg"
];

// 3D item object
var steve = [];                                         // steve object
var trump = [];                                         // trump object
var cube = [];                                          // cube object
var sphere = [];                                        // sphere object
var ball = [];                                          // ball object
var pyramid = [];                                       // pyramid object
var cylinder = [];                                      // cylinder object
var screen = [];
var shuttle = [];

// planets
var planets = [
    {
        obj: 'mercury.obj',
        img: 'mercury.jpg',
        speed: 0.48,
        angle: Math.random() * 360,
    },
    {
        obj: 'venus.obj',
        img: 'venus.png',
        speed: 0.35,
        angle: Math.random() * 360,
    },
    {
        obj: 'earth.obj',
        img: 'earth.jpg',
        speed: 0.3,
        angle: Math.random() * 360,
    },
    {
        obj: 'mars.obj',
        img: 'mars.jpg',
        speed: 0.24,
        angle: Math.random() * 360,
    },
    {
        obj: 'jupiter.obj',
        img: 'jupiter.jpg',
        speed: 0.13,
        angle: Math.random() * 360,
    },
    {
        obj: 'jupiter-ring.obj',
        img: 'jupiter-ring.png',
        speed: 0.13,
        angle: 0,
    },
    {
        obj: 'saturn.obj',
        img: 'saturn.jpg',
        speed: 0.1,
        angle: Math.random() * 360,
    },
    {
        obj: 'saturn-ring.obj',
        img: 'saturn-ring.jpg',
        speed: 0.1,
        angle: 0,
    },
    {
        obj: 'uranus.obj',
        img: 'uranus.jpg',
        speed: 0.07,
        angle: Math.random() * 360,
    },
    {
        obj: 'neptune.obj',
        img: 'neptune.jpg',
        speed: 0.05,
        angle: Math.random() * 360,
    },
];

var planetsObj = [];

// secret
var secret_string = '';

async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }
    
    var quad = new Float32Array([
        -1, -1, 1,
        1, -1, 1,
        -1, 1, 1,
        -1, 1, 1,
        1, -1, 1,
        1,  1, 1
    ]);

    // initialize framebuffer object
    reflectBall = initFrameBufferForCubemapRendering(gl);
    quadObj = initVertexBufferForLaterUse(gl, quad);

    if(current_screen === 'War'){
        cubeMapTex = initCubeTexture("posx.jpg", "negx.jpg", "posy.jpg", "negy.jpg", 
                "posz.jpg", "negz.jpg", 2048, 2048);
    }
    else{
        cubeMapTex = initCubeTexture("px.jpg", "nx.jpg", "py.jpg", "ny.jpg", 
                "pz.jpg", "nz.jpg", 350, 350);
    }
    
    // define environment cubemap shader
    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position'); 
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    programEnvCube.u_viewDirectionProjectionInverse = 
               gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse'); 

    // define normal shader 
    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.useProgram(program);
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    program.a_NormalCoord = gl.getAttribLocation(program, 'a_NormalCoord');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.a_Tagent = gl.getAttribLocation(program, 'a_Tagent');
    program.a_Bitagent = gl.getAttribLocation(program, 'a_Bitagent');
    program.a_crossTexCoord = gl.getAttribLocation(program, 'a_crossTexCoord');
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_Color = gl.getUniformLocation(program, 'u_Color');
    program.u_useTexture = gl.getUniformLocation(program, "u_useTexture");
    program.u_Sampler_Texture = gl.getUniformLocation(program, "u_Sampler_Texture");
    program.u_useNormal = gl.getUniformLocation(program, "u_useNormal");
    program.u_Sampler_Normal = gl.getUniformLocation(program, "u_Sampler_Normal");

    programTextureOnCube = compileShader(gl, VSHADER_SOURCE_TEXTURE_ON_CUBE, FSHADER_SOURCE_TEXTURE_ON_CUBE);
    programTextureOnCube.a_Position = gl.getAttribLocation(programTextureOnCube, 'a_Position'); 
    programTextureOnCube.a_Normal = gl.getAttribLocation(programTextureOnCube, 'a_Normal'); 
    programTextureOnCube.u_MvpMatrix = gl.getUniformLocation(programTextureOnCube, 'u_MvpMatrix'); 
    programTextureOnCube.u_modelMatrix = gl.getUniformLocation(programTextureOnCube, 'u_modelMatrix'); 
    programTextureOnCube.u_normalMatrix = gl.getUniformLocation(programTextureOnCube, 'u_normalMatrix');
    programTextureOnCube.u_ViewPosition = gl.getUniformLocation(programTextureOnCube, 'u_ViewPosition');
    programTextureOnCube.u_envCubeMap = gl.getUniformLocation(programTextureOnCube, 'u_envCubeMap'); 
    programTextureOnCube.u_Color = gl.getUniformLocation(programTextureOnCube, 'u_Color'); 

    // define obj
    steve = await loadOBJtoCreateVBO('steve.obj');
    trump = await loadOBJtoCreateVBO('trump.obj');
    sphere = await loadOBJtoCreateVBO('sphere.obj');
    screen = await loadOBJtoCreateVBO('cube.obj');
    shuttle = await loadOBJtoCreateVBO('space-shuttle-orbiter.obj');

    // define planets obj
    for await (planet of planets)
        planetsObj.push(await loadOBJtoCreateVBO(planet.obj));

    // initialize texture
    for(let i = 0; i < imgNames.length; i++){
        let image = new Image();
        image.onload = function(){
            initTexture(gl, image, imgNames[i]);
        };
        image.src = 'texture/' + imgNames[i];
    }
    planets.forEach(planet => {
        let image = new Image();
        image.onload = function(){
            initTexture(gl, image, planet.img);
        };
        image.src = 'texture/' + planet.img;
    });

    // initialize object vertices
    cube_normal = getNormalOnVertices(cube_vertices);
    o = initVertexBufferForLaterUse(gl, cube_vertices, cube_normal, null);
    cube.push(o);

    ball_normal = getNormalOnVertices(ball_vertices());
    o = initVertexBufferForLaterUse(gl, ball_vertices(), ball_normal, null);
    ball.push(o);

    cylinder_normal = getNormalOnVertices(cylinder_vertices());
    o = initVertexBufferForLaterUse(gl, cylinder_vertices(), cylinder_normal, null);
    cylinder.push(o);

    pyramid_normal = getNormalOnVertices(pyramid_vertices);
    o = initVertexBufferForLaterUse(gl, pyramid_vertices, pyramid_normal, null);
    pyramid.push(o);

    // initialize matrix
    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();

    gl.enable(gl.DEPTH_TEST);

    draw();     //draw it once before mouse move

    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};

    var switch_perspective = document.getElementById("switch");
    switch_perspective.checked = true;
    switch_perspective.oninput = function(){
        perspective = this.checked;
        draw();
    }

    var switch_screen = document.getElementById("screen");
    switch_screen.oninput = function(){
        current_screen = this.checked ? 'Outspace' : 'War';
        current_pers = camera[current_screen];
        if(current_screen === 'Outspace')
            document.getElementById("tank_params").style.display = 'none';
        else
            document.getElementById("tank_params").style.display = 'flex';
        main();
    }

    var scale_slider = document.getElementById("scale");
    scale_slider.oninput = function(){
        scale = Number(this.value) * 3 / 100;
        draw();
    }

    var tankx_slider = document.getElementById("tank_x");
    tankx_slider.oninput = function(){
        tank_x = Number(this.value) / 10 + 3;
        draw();
    }

    var tanky_slider = document.getElementById("tank_y");
    tanky_slider.oninput = function(){
        tank_y = Number(this.value) / 10;
        draw();
    }

    var direction_slider = document.getElementById("direction");
    direction_slider.oninput = function(){
        direction = this.value;
        draw();
    }

    var vertical_slider = document.getElementById("vertical");
    vertical_slider.oninput = function(){
        vertical = this.value;
        draw();
    }
    
    window.onkeydown = (e) => {
        if(e.keyCode == 87)
            current_pers.pos_z -= 1;
        else if(e.keyCode == 83)
            current_pers.pos_z += 1;
        else if(e.keyCode == 65)
            current_pers.pos_x -= 1;
        else if(e.keyCode == 68)
            current_pers.pos_x += 1;
        else if(e.keyCode == 32)
            current_pers.pos_y += 1;
        else if(e.keyCode == 16)
            current_pers.pos_y -= 1;
        
        if(secret_string.length >= 10 || e.keyCode == 8)
            secret_string = '';
        else secret_string += e.key;
        
        console.log(secret_string)
        
        if(secret_string === 'allpass'){
            reset_planets().then(() => {
                alert("Wish everyone all pass this semester!!!");
            });
        }

        draw();
    }

    if(current_screen === 'Outspace'){
        var tick = function() {
            if(secret_string === 'allpass') return;
            planets.forEach(planet => {
                planet.angle = (planet.angle + planet.speed) % 360;
            });
            draw();
            requestAnimationFrame(tick);
        }

        planets[5].angle = planets[4].angle;
        planets[7].angle = planets[6].angle;

        // planets.forEach(planet => {
        //     planet.angle = 0;
        // });

        tick();
    }
}

function draw(){
    if(current_screen === 'Outspace') renderCubeMap(0, 0, 0);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);

    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 100);
    
    if(perspective){
        var rotateMatrix = new Matrix4();
        rotateMatrix.setRotate(angleY, 1, 0, 0);
        rotateMatrix.rotate(angleX, 0, 1, 0);
    
        var view_direction = new Vector3([current_pers.dir_x, current_pers.dir_y, current_pers.dir_z]);
        new_view_dir = rotateMatrix.multiplyVector3(view_direction);

        vpFromCamera.lookAt(
            current_pers.pos_x,
            current_pers.pos_y,
            current_pers.pos_z,
            current_pers.pos_x + new_view_dir.elements[0],
            current_pers.pos_y + new_view_dir.elements[1],
            current_pers.pos_z + new_view_dir.elements[2],
            0, 1, 0
        );
    }
    else{
        let dis_r = 3.0 * Math.cos(Math.PI / 180 * angleY);
        let dis_x = dis_r * Math.sin(Math.PI / 180 * angleX);
        let dis_z = -dis_r * Math.cos(Math.PI / 180 * angleX);
        let dis_y = 3.0 * Math.sin(Math.PI / 180 * angleY);
        
        vpFromCamera.lookAt(
            current_pers.pos_x - dis_x,
            current_pers.pos_y - dis_y,
            current_pers.pos_z - dis_z,
            current_pers.pos_x,
            current_pers.pos_y,
            current_pers.pos_z,
            0, 1, 0
        );
    }

    this ['draw' + current_screen](vpFromCamera);
}

function drawOutspace(vpFromCamera){
    scale = 1.5;

    let mdlMatrix = new Matrix4();
    if(!perspective) mdlMatrix.translate(0, 0, -3.0);
    
    mdlMatrix.translate(camera.Outspace.pos_x, camera.Outspace.pos_y - 1, camera.Outspace.pos_z);
    mdlMatrix.scale(0.15, 0.15, 0.15);
    mdlMatrix.rotate(90, 0, 1, 0);
    drawOneObject(steve, mdlMatrix, vpFromCamera, 0.4, 1.0, 0.4, "Steve.png");
    mdlMatrix.setIdentity();
    if(!perspective) mdlMatrix.translate(0, 0, -3.0);

    drawPlanets(vpFromCamera);
    drawEnvMap();
    
    mdlMatrix.scale(5.0, 5.0, 5.0);
    drawReflectObject(sphere, mdlMatrix, vpFromCamera, 0, 0, 0);
}

function drawWar(vpFromCamera){
    scale = 1.0;

    let mdlMatrix = new Matrix4();
    if(!perspective) mdlMatrix.translate(0, 0, -3.0);
    
    mdlMatrix.translate(camera.War.pos_x, camera.War.pos_y - 1, camera.War.pos_z);
    mdlMatrix.scale(0.15, 0.15, 0.15);
    mdlMatrix.rotate(90, 0, 1, 0);
    drawOneObject(steve, mdlMatrix, vpFromCamera, 0.4, 1.0, 0.4, "Steve.png");
    mdlMatrix.setIdentity();

    // setup ground with cube
    mdlMatrix.translate(0.0, -0.4, 0.0);
    mdlMatrix.scale(10.0, 0.1, 10.0);
    drawOneObject(cube, mdlMatrix, vpFromCamera, 0.7, 0.7, 0.7);
    mdlMatrix.setIdentity();
    if(!perspective) mdlMatrix.translate(0, 0, -3.0);

    // trump object
    mdlMatrix.translate(-5.0, -0.3, 0.0);
    mdlMatrix.rotate(90, 0, 1, 0);
    drawOneObject(trump, mdlMatrix, vpFromCamera, 1.0, 1.0, 1.0, "trump.png");
    mdlMatrix.setIdentity();

    mdlMatrix.translate(-3.0, 0, 0);
    drawTank(vpFromCamera, mdlMatrix);
    mdlMatrix.setIdentity();
    mdlMatrix.translate(-1.5, 0, 3.0);
    drawTank(vpFromCamera, mdlMatrix);
    mdlMatrix.setIdentity();
    mdlMatrix.translate(0.5, 0.0, -3.0);
    drawTank(vpFromCamera, mdlMatrix);
    mdlMatrix.setIdentity();
    drawEnvMap();
}

function drawTank(vpMatrix, mvMatrix){
    let srcMatrix = new Matrix4();
    let mdlMatrix = new Matrix4();

    srcMatrix.set(mvMatrix);
    srcMatrix.translate(tank_x, 0.0, tank_y);
    if(!perspective) srcMatrix.translate(0, 0, -3.0);

    // left front wheel
    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();

    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // left front pyramid
    mdlMatrix.translate(2.1, 0.0, 1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, -1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, vpMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // left back wheel
    mdlMatrix.translate(4.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(4.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // left back pyramid
    mdlMatrix.translate(3.9, 0.0, 1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, -1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, vpMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // right front wheel
    mdlMatrix.translate(2.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(2.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right front pyramid
    mdlMatrix.translate(2.1, 0.0, -1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, -1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, 1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, vpMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // right back wheel
    mdlMatrix.translate(4.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(4.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right back pyramid
    mdlMatrix.translate(3.9, 0.0, -1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, -1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, 1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, vpMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // left rectangle
    mdlMatrix.translate(3.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(3.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.25, 0.31);
    drawOneObject(cube, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right rectangle
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, vpMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.25, 0.31);
    drawOneObject(cube, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    srcMatrix.rotate(direction, 0, 1, 0);

    // center base
    mdlMatrix.translate(3.0, 0.3, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.7, 0.3, 0.7);
    drawOneObject(cube, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // center fort
    mdlMatrix.translate(3.0, 0.6, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.5, 0.5, 0.5);
    drawOneObject(ball, mdlMatrix, vpMatrix, 0.8, 0.8, 0.0);
    mdlMatrix.setIdentity();

    srcMatrix.rotate(vertical, 0, 0, -1);

    // // gun barrel
    mdlMatrix.translate(3.0, 0.85, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 0, 1, 0);
    mdlMatrix.translate(0.0, 0.0, -1.0);
    mdlMatrix.scale(0.15, 0.15, 1.0);
    drawOneObject(cylinder, mdlMatrix, vpMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();
}

function drawPlanets(vpMatrix){
    let srcMatrix = new Matrix4();
    if(!perspective)
        srcMatrix.translate(0, 0, -3.0);

    let mdlMatrix = new Matrix4();
    mdlMatrix.set(srcMatrix);

    mdlMatrix.rotate(planets[0].angle, 0, 1, 0);
    mdlMatrix.translate(14, 0, 0.19);
    mdlMatrix.scale(1.5, 1.5, 1.5);
    drawOneObject(planetsObj[0], mdlMatrix, vpMatrix, 0.0, 0.0, 0.0, planets[0].img, "151_norm.jpg");
    mdlMatrix.set(srcMatrix);

    mdlMatrix.rotate(planets[1].angle, 0, 1, 0);
    mdlMatrix.translate(16.0, -1.0, 0.0);
    mdlMatrix.scale(0.6, 0.6, 0.6);
    drawOneObject(planetsObj[1], mdlMatrix, vpMatrix, 0, 0, 0, planets[1].img, "151_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[2].angle, 0, 1, 0);
    mdlMatrix.translate(18.0, 0, 0);
    drawOneObject(planetsObj[2], mdlMatrix, vpMatrix, 0, 0, 0, planets[2].img, "151_norm.jpg");
    mdlMatrix.set(srcMatrix);

    mdlMatrix.rotate(planets[2].angle, 0, 1, 0);
    mdlMatrix.translate(19.0, 3.0, 0);
    mdlMatrix.scale(0.01, 0.01, 0.01);
    drawOneObject(shuttle, mdlMatrix, vpMatrix, 0, 0, 0, "spstob_1.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[3].angle, 0, 1, 0);
    mdlMatrix.translate(20.0, 0, 0.55);
    mdlMatrix.scale(3.0, 3.0, 3.0);
    drawOneObject(planetsObj[3], mdlMatrix, vpMatrix, 0, 0, 0, planets[3].img, "151_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[4].angle, 0, 1, 0);
    mdlMatrix.translate(26.0, 0, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(planetsObj[4], mdlMatrix, vpMatrix, 0, 0, 0, planets[4].img, "184_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[5].angle, 0, 1, 0);
    mdlMatrix.translate(26.0, 0, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(planetsObj[5], mdlMatrix, vpMatrix, 0, 0, 0, planets[5].img, "184_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[6].angle, 0, 1, 0);
    mdlMatrix.translate(34.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[6], mdlMatrix, vpMatrix, 0, 0, 0, planets[6].img, "184_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[7].angle, 0, 1, 0);
    mdlMatrix.translate(34.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[7], mdlMatrix, vpMatrix, 0, 0, 0, planets[7].img, "184_norm.jpg");
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[8].angle, 0, 1, 0);
    mdlMatrix.translate(41.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[8], mdlMatrix, vpMatrix, 0, 0, 0, planets[8].img);
    mdlMatrix.set(srcMatrix);
    
    mdlMatrix.rotate(planets[9].angle, 0, 1, 0);
    mdlMatrix.translate(47.0, 0, 0.5);
    mdlMatrix.scale(10.0, 10.0, 10.0);
    drawOneObject(planetsObj[9], mdlMatrix, vpMatrix, 0, 0, 0, planets[9].img);
    mdlMatrix.set(srcMatrix);
}

function drawOneObject(obj, mdlMatrix, vpMatrix, colorR, colorG, colorB, image_name = null, normal_name = null){
    gl.useProgram(program);
    
    let mvpMatrix = new Matrix4();
    let modelMatrix = new Matrix4();
    let normalMatrix = new Matrix4();

    modelMatrix.set(mdlMatrix);
    modelMatrix.scale(scale, scale, scale);
    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.uniform3f(program.u_LightPosition, 0.0, 5.0, 3.0);
    gl.uniform3f(program.u_ViewPosition, current_pers.pos_x, current_pers.pos_y, current_pers.pos_z);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);
    gl.uniform3f(program.u_Color, colorR, colorG, colorB);

    // use texture
    if(image_name && normal_name){
        gl.uniform1i(program.u_useNormal, 1);
        gl.uniform1i(program.u_useTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[image_name]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures[normal_name]);
        gl.uniform1i(program.u_Sampler_Texture, 0);
        gl.uniform1i(program.u_Sampler_Normal, 1);
    }
    else if(image_name){
        gl.uniform1i(program.u_useNormal, 0);
        gl.uniform1i(program.u_useTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[image_name]);
        gl.uniform1i(program.u_Sampler_Texture, 0);
    }
    else{
        gl.uniform1i(program.u_useTexture, 0);
        gl.uniform1i(program.u_useNormal, 0);
    }

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);    

    for(let i = 0; i < obj.length; i++){
        initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
        initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);
        if(image_name){
            initAttributeVariable(gl, program.a_Tagent, obj[i].tagentsBuffer);
            initAttributeVariable(gl, program.a_Bitagent, obj[i].bitagentsBuffer);
            initAttributeVariable(gl, program.a_crossTexCoord, obj[i].crossTexCoordsBuffer);
            initAttributeVariable(gl, program.a_TexCoord, obj[i].texCoordBuffer);
        }
        if(normal_name) initAttributeVariable(gl, program.a_NormalCoord, obj[i].texCoordBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawReflectObject(obj, mdlMatrix, vpMatrix, colorR, colorG, colorB){
    gl.useProgram(programTextureOnCube);

    let mvpMatrix = new Matrix4();
    let normalMatrix = new Matrix4();
    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(mdlMatrix);
  
    //normal matrix
    normalMatrix.setInverseOf(mdlMatrix);
    normalMatrix.transpose();
  
    gl.uniform3f(programTextureOnCube.u_ViewPosition, 0.0 * scale, 5.0 * scale, 3.0 * scale);
    gl.uniform3f(programTextureOnCube.u_Color, colorR, colorG, colorB);
  
    gl.uniformMatrix4fv(programTextureOnCube.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(programTextureOnCube.u_modelMatrix, false, mdlMatrix.elements);
    gl.uniformMatrix4fv(programTextureOnCube.u_normalMatrix, false, normalMatrix.elements);
  
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflectBall.texture);
    gl.uniform1i(programTextureOnCube.u_envCubeMap, 0);
  
    for( let i=0; i < obj.length; i ++ ){
        initAttributeVariable(gl, programTextureOnCube.a_Position, obj[i].vertexBuffer);
        initAttributeVariable(gl, programTextureOnCube.a_Normal, obj[i].normalBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

function renderCubeMap(camX, camY, camZ){
    //camera 6 direction to render 6 cubemap faces
    var ENV_CUBE_LOOK_DIR = [
        [1.0, 0.0, 0.0],
        [-1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, -1.0, 0.0],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, -1.0]
    ];

    //camera 6 look up vector to render 6 cubemap faces
    var ENV_CUBE_LOOK_UP = [
        [0.0, 1.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, -1.0],
        [0.0, -1.0, 0.0],
        [0.0, -1.0, 0.0]
    ];

    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflectBall);
    gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    gl.clearColor(0.4, 0.4, 0.4, 1);
    for (var side = 0; side < 6; side++){
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                                gl.TEXTURE_CUBE_MAP_POSITIVE_X + side, reflectBall.texture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let vpMatrix = new Matrix4();
        vpMatrix.setPerspective(90, 1, 1, 100);
        vpMatrix.lookAt(
            camX, camY, camZ,
            camX + ENV_CUBE_LOOK_DIR[side][0],
            camY + ENV_CUBE_LOOK_DIR[side][1],
            camZ + ENV_CUBE_LOOK_DIR[side][2],
            ENV_CUBE_LOOK_UP[side][0],
            ENV_CUBE_LOOK_UP[side][1],
            ENV_CUBE_LOOK_UP[side][2]
        );
        
        drawPlanets(vpMatrix);
        drawEnvMap(vpMatrix);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawEnvMap(vpMatrix){
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    
    if(vpMatrix == null){
        let rotateMatrix = new Matrix4();
        rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
        rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
        var viewDir= new Vector3([current_pers.pos_x, current_pers.pos_y, current_pers.pos_z]);
        newViewDir = rotateMatrix.multiplyVector3(viewDir);
    
        var vpFromCamera = new Matrix4();
        vpFromCamera.setPerspective(60, 1, 1, 100);
        var viewMatrixRotationOnly = new Matrix4();
        viewMatrixRotationOnly.lookAt(current_pers.pos_x, current_pers.pos_y, current_pers.pos_z,
            current_pers.pos_x + new_view_dir.elements[0],
            current_pers.pos_y + new_view_dir.elements[1],
            current_pers.pos_z + new_view_dir.elements[2],
            0, 1, 0);
        
        viewMatrixRotationOnly.elements[12] = 0;
        viewMatrixRotationOnly.elements[13] = 0;
        viewMatrixRotationOnly.elements[14] = 0;
        vpFromCamera.multiply(viewMatrixRotationOnly);
        var vpFromCameraInverse = vpFromCamera.invert();
    }
    else{
        vpMatrix.elements[12] = 0;
        vpMatrix.elements[13] = 0;
        vpMatrix.elements[14] = 0;
        var vpFromCameraInverse = vpMatrix.invert();
    }
  
    gl.useProgram(programEnvCube);
    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
                        false, vpFromCameraInverse.elements);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}

async function reset_planets(){
    angleX = -48;
    angleY = -48;
    current_pers = {
        dir_x: 0,
        dir_y: 16,
        dir_z: -38,
        pos_x: -62,
        pos_y: 20,
        pos_z: 70,
    };

    return new Promise(function(resolve, reject){
        var clock = setInterval(() => {
            let change = true;
            for(let i = 0; i < 8; i++){
                let index = i > 4 ? (i > 5 ? i + 2 : i + 1) : i;
                if(i % 2 == 0){
                    if(planets[index].angle == 120) continue;
                    else{
                        change = false;
                        planets[index].angle = (planets[index].angle + 1) % 360;
                        planets[index].angle = Math.abs(planets[index].angle - 120) <= 3 ? 120 : planets[index].angle;
                    }
                }
                else{
                    if(planets[index].angle == 300) continue;
                    else{
                        change = false;
                        planets[index].angle = (planets[index].angle + 1) % 360;
                        planets[index].angle = Math.abs(planets[index].angle - 300) <= 3 ? 300 : planets[index].angle;
                    }
                }
                
                planets[5].angle = planets[4].angle;
                planets[7].angle = planets[6].angle;
            }
            if(change){
                clearInterval(clock);
                resolve(1);
            }
            else draw()
        }, 50);
    });
}