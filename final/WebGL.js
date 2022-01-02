// mouse & keyboard status
var mouseLastX, mouseLastY;
var mouseDragging = false;

// render image parameter
var angleX = 0, angleY = 0;
var scale = 0.4;
var tank_x = 3.0;
var tank_y = 0.0;
var direction = 0.0;
var vertical = 0.0;

// offscreen setting parameters
var new_view_dir;
var shaderMode = 'on';
var offScreenWidth = 3200, offScreenHeight = 3200;
var offCameraX = 0, offCameraY = 5, offCameraZ = 5;      // offscreen veiw position
var offCameraDirX = 0, offCameraDirY = -1, offCameraDirZ = -1;   // offscreen view direction

// render demanded matrix
var gl, canvas, fbo;
var mvpMatrix;
var modelMatrix;
var normalMatrix;

// camera view
var cameraX = 0, cameraY = 0, cameraZ = 5;              // view position
var cameraDirX = 0, cameraDirY = 0, cameraDirZ = -1;    // view direction

// image name and object
var textures = {};                                      // texture object
var imgNames = [                                        // define image name
    "Steve.png",
    "trump.png",
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
    fbo = initFrameBuffer(gl);
    quadObj = initVertexBufferForLaterUse(gl, quad);
    cubeMapTex = initCubeTexture("px.jpg", "nx.jpg", "py.jpg", "ny.jpg", 
                                 "pz.jpg", "nz.jpg", 350, 350)

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
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_lightMatrix = gl.getUniformLocation(program, 'u_lightMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_Color = gl.getUniformLocation(program, 'u_Color');
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler");
    program.u_useTexture = gl.getUniformLocation(program, "u_useTexture");

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
            cameraZ -= 1;
        else if(e.keyCode == 83)
            cameraZ += 1;
        else if(e.keyCode == 65)
            cameraX -= 1;
        else if(e.keyCode == 68)
            cameraX += 1;
        draw();
    }

    var tick = function() {
        planets.forEach(planet => {
            planet.angle = (planet.angle + planet.speed) % 360;
        });
        draw();
        requestAnimationFrame(tick);
    }

    planets[5].angle = planets[4].angle;
    planets[7].angle = planets[6].angle;
    tick();
}

function draw(){
    // gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    // gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    // drawOffScreen();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    drawOnScreen();
}

function drawOffScreen(){
    // clear canvas
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // open gl depth render
    gl.enable(gl.DEPTH_TEST);

    var rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);
    rotateMatrix.rotate(angleX, 0, 1, 0);

    var view_direction = new Vector3([offCameraDirX, offCameraDirY, offCameraDirZ]);
    new_view_dir = rotateMatrix.multiplyVector3(view_direction);
    
    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 100);
    var viewMatrixRotationOnly = new Matrix4();

    viewMatrixRotationOnly.lookAt(offCameraX, offCameraY, offCameraZ,
                                offCameraX + new_view_dir.elements[0],
                                offCameraY + new_view_dir.elements[1],
                                offCameraZ + new_view_dir.elements[2],
                                0, 1, 0);

    viewMatrixRotationOnly.elements[12] = 0;
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;

    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();

    // background quad shader
    gl.useProgram(programEnvCube);
    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, false, vpFromCameraInverse.elements);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
    gl.bindTexture(gl.TEXTURE_2D, null);

    shaderMode = 'off';
    let mdlMatrix = new Matrix4(); //model matrix of objects
    mdlMatrix.setIdentity();

    // set light location
    mdlMatrix.translate(0.0, 5.0, 3.0);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(ball, mdlMatrix, 1.0, 1.0, 1.0);
    mdlMatrix.setIdentity();

    // setup ground with cube
    mdlMatrix.translate(0.0, -0.4, 0.0);
    mdlMatrix.scale(7.0, 0.1, 7.0);
    drawOneObject(cube, mdlMatrix, 0.7, 0.7, 0.7);
    mdlMatrix.setIdentity();

    // trump object
    mdlMatrix.translate(-5.0, -0.3, 0.0);
    mdlMatrix.rotate(90, 0, 1, 0);
    drawOneObject(trump, mdlMatrix, 1.0, 1.0, 1.0, "trump.png");
    mdlMatrix.setIdentity();

    drawTank();
}

function drawOnScreen(){
    // clear canvas
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // open gl depth render
    gl.enable(gl.DEPTH_TEST);

    var rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);
    rotateMatrix.rotate(angleX, 0, 1, 0);

    var view_direction = new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    new_view_dir = rotateMatrix.multiplyVector3(view_direction);
    
    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 100);
    var viewMatrixRotationOnly = new Matrix4();


    viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ,
                                cameraX + new_view_dir.elements[0],
                                cameraY + new_view_dir.elements[1],
                                cameraZ + new_view_dir.elements[2],
                                0, 1, 0);
    
    viewMatrixRotationOnly.elements[12] = 0;
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;

    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();

    // background quad shader
    gl.useProgram(programEnvCube);
    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, false, vpFromCameraInverse.elements);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
    gl.bindTexture(gl.TEXTURE_2D, null);

    shaderMode = 'on';
    let srcMatrix = new Matrix4();
    srcMatrix.translate(tank_x, 0.0, tank_y);
    let mdlMatrix = new Matrix4(); //model matrix of objects
    mdlMatrix.setIdentity();

    // // set light location
    // mdlMatrix.translate(0.0, 5.0, 3.0);
    // mdlMatrix.scale(0.3, 0.3, 0.3);
    // drawOneObject(ball, mdlMatrix, 1.0, 1.0, 1.0);
    // mdlMatrix.setIdentity();

    // // setup ground with cube
    // mdlMatrix.translate(0.0, -0.4, 0.0);
    // mdlMatrix.scale(7.0, 0.1, 7.0);
    // drawOneObject(cube, mdlMatrix, 0.7, 0.7, 0.7);
    // mdlMatrix.setIdentity();

    // // trump object
    // mdlMatrix.translate(-5.0, -0.3, 0.0);
    // mdlMatrix.rotate(90, 0, 1, 0);
    // drawOneObject(trump, mdlMatrix, 1.0, 1.0, 1.0, "trump.png");
    // mdlMatrix.setIdentity();

    // drawTank();

    // mdlMatrix.translate(0, 7, -10);
    // mdlMatrix.scale(7.0, 7.0, 0.1);
    // drawOneObject(screen, mdlMatrix, 0.0, 0.0, 0.0, 'frame_buffer');
    // mdlMatrix.setIdentity();
    
    mdlMatrix.scale(0.7, 0.7, 0.7);
    drawOneObject(sphere, mdlMatrix, 1, 1, 1);
    mdlMatrix.setIdentity();

    mdlMatrix.rotate(planets[0].angle, 0, 1, 0);
    mdlMatrix.translate(2.5, 0, 0.19);
    mdlMatrix.scale(1.5, 1.5, 1.5);
    drawOneObject(planetsObj[0], mdlMatrix, 0.0, 0.0, 0.0, planets[0].img);
    mdlMatrix.setIdentity();

    mdlMatrix.rotate(planets[1].angle, 0, 1, 0);
    mdlMatrix.translate(4.0, -0.75, 0.0);
    mdlMatrix.scale(0.6, 0.6, 0.6);
    drawOneObject(planetsObj[1], mdlMatrix, 0, 0, 0, planets[1].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[2].angle, 0, 1, 0);
    mdlMatrix.translate(6.0, 0, 0);
    drawOneObject(planetsObj[2], mdlMatrix, 0, 0, 0, planets[2].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[3].angle, 0, 1, 0);
    mdlMatrix.translate(8.0, 0, 0.55);
    mdlMatrix.scale(3.0, 3.0, 3.0);
    drawOneObject(planetsObj[3], mdlMatrix, 0, 0, 0, planets[3].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[4].angle, 0, 1, 0);
    mdlMatrix.translate(14.0, 0, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(planetsObj[4], mdlMatrix, 0, 0, 0, planets[4].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[5].angle, 0, 1, 0);
    mdlMatrix.translate(14.0, 0, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(planetsObj[5], mdlMatrix, 0, 0, 0, planets[5].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[6].angle, 0, 1, 0);
    mdlMatrix.translate(24.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[6], mdlMatrix, 0, 0, 0, planets[6].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[7].angle, 0, 1, 0);
    mdlMatrix.translate(24.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[7], mdlMatrix, 0, 0, 0, planets[7].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[8].angle, 0, 1, 0);
    mdlMatrix.translate(30.0, 0, 0.55);
    mdlMatrix.scale(8.0, 8.0, 8.0);
    drawOneObject(planetsObj[8], mdlMatrix, 0, 0, 0, planets[8].img);
    mdlMatrix.setIdentity();
    
    mdlMatrix.rotate(planets[9].angle, 0, 1, 0);
    mdlMatrix.translate(34.0, 0, 0.5);
    mdlMatrix.scale(10.0, 10.0, 10.0);
    drawOneObject(planetsObj[9], mdlMatrix, 0, 0, 0, planets[9].img);
    mdlMatrix.setIdentity();
}

function drawTank(){
    let srcMatrix = new Matrix4();
    let mdlMatrix = new Matrix4();
    srcMatrix.translate(tank_x, 0.0, tank_y);

    // left front wheel
    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();

    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // left front pyramid
    mdlMatrix.translate(2.1, 0.0, 1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, -1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // left back wheel
    mdlMatrix.translate(4.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(4.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // left back pyramid
    mdlMatrix.translate(3.9, 0.0, 1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, -1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // right front wheel
    mdlMatrix.translate(2.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(2.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right front pyramid
    mdlMatrix.translate(2.1, 0.0, -1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, -1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, 1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // right back wheel
    mdlMatrix.translate(4.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(4.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.25, 0.25, 0.31);
    drawOneObject(cylinder, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right back pyramid
    mdlMatrix.translate(3.9, 0.0, -1.3);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, -1, 0, 0);
    mdlMatrix.rotate((tank_x - 3.0) * 45, 0, 1, 0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    drawOneObject(pyramid, mdlMatrix, 1.0, 1.0, 0.0);
    mdlMatrix.setIdentity();

    // left rectangle
    mdlMatrix.translate(3.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(3.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.25, 0.31);
    drawOneObject(cube, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // right rectangle
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, 0, 0, 0);
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.25, 0.31);
    drawOneObject(cube, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    srcMatrix.rotate(direction, 0, 1, 0);

    // center base
    mdlMatrix.translate(3.0, 0.3, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.7, 0.3, 0.7);
    drawOneObject(cube, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();

    // center fort
    mdlMatrix.translate(3.0, 0.6, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.5, 0.5, 0.5);
    drawOneObject(ball, mdlMatrix, 0.8, 0.8, 0.0);
    mdlMatrix.setIdentity();

    // setup steve
    mdlMatrix.translate(3.0, 0.5, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(180, 0, 1, 0);
    mdlMatrix.translate(-0.6, 0.0, 0.0);
    mdlMatrix.scale(0.15, 0.15, 0.15);
    drawOneObject(steve, mdlMatrix, 0.4, 1.0, 0.4, "Steve.png");
    mdlMatrix.setIdentity();

    srcMatrix.rotate(vertical, 0, 0, -1);

    // // gun barrel
    mdlMatrix.translate(3.0, 0.85, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.rotate(90, 0, 1, 0);
    mdlMatrix.translate(0.0, 0.0, -1.0);
    mdlMatrix.scale(0.15, 0.15, 1.0);
    drawOneObject(cylinder, mdlMatrix, 0.00784, 0.36863, 0.12941);
    mdlMatrix.setIdentity();
}

function drawOneObject(obj, mdlMatrix, colorR, colorG, colorB, image_name){
    //model Matrix (part of the mvp matrix)
    modelMatrix.setScale(scale, scale, scale);
    modelMatrix.multiply(mdlMatrix);
    //mvp: projection * view * model matrix
    mvpMatrix.setPerspective(60, 1, 1, 15);
    if(shaderMode === 'on'){
        mvpMatrix.lookAt(cameraX, cameraY, cameraZ,
                        cameraX + new_view_dir.elements[0],
                        cameraY + new_view_dir.elements[1],
                        cameraZ + new_view_dir.elements[2],
                        0, 1, 0);
    }
    else{
        mvpMatrix.lookAt(offCameraX, offCameraY, offCameraZ,
                        offCameraX + new_view_dir.elements[0],
                        offCameraY + new_view_dir.elements[1],
                        offCameraZ + new_view_dir.elements[2],
                        0, 1, 0);
    }
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.useProgram(program);

    gl.uniform3f(program.u_LightPosition, 0.0 * scale, 5.0 * scale, 3.0 * scale);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);
    gl.uniform3f(program.u_Color, colorR, colorG, colorB);

    // use texture
    if(image_name){
        gl.uniform1i(program.u_useTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        if(image_name === 'frame_buffer')
            gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        else
            gl.bindTexture(gl.TEXTURE_2D, textures[image_name]);
        gl.uniform1i(program.u_Sampler, 0);
    }
    else gl.uniform1i(program.u_useTexture, 0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);    

    for(let i = 0; i < obj.length; i++){
        initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
        initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);
        if(image_name) initAttributeVariable(gl, program.a_TexCoord, obj[i].texCoordBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
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
