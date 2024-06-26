var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform sampler2D u_Sampler;    // texture sampler
    uniform vec3 u_Color;           // object color
    uniform int u_useTexture;       // whether use texture
    uniform vec3 u_LightPosition;   // light position
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    void main(){
        // define light color
        vec3 ambientLightColor;
        vec3 diffuseLightColor;

        if(bool(u_useTexture)){
            // use texture color
            vec3 texColor = texture2D( u_Sampler, v_TexCoord ).rgb;
            ambientLightColor = texColor;
            diffuseLightColor = texColor;
        }
        else{
            // use specified color
            ambientLightColor = u_Color;
            diffuseLightColor = u_Color;
        }

        // assume white specular light
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal = normalize(v_Normal);
        // compute lihgt direction vector
        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        // if angle larger than 90, do not use
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            // compute the reflection of light vector
            vec3 R = reflect(-lightDirection, normal);  // notice that there probably have opposite direction
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            // compute the angle of reflection and view point
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        gl_FragColor = vec4( ambient + diffuse + specular, 1.0 );
    }
`;

var VSHADER_SOURCE_ENVCUBE = `
  attribute vec4 a_Position;
  varying vec4 v_Position;
  void main() {
    v_Position = a_Position;
    gl_Position = a_Position;
  } 
`;

var FSHADER_SOURCE_ENVCUBE = `
  precision mediump float;
  uniform samplerCube u_envCubeMap;
  uniform mat4 u_viewDirectionProjectionInverse;
  varying vec4 v_Position;
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_Position;
    gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
  }
`;

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The following three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Store the necessary information to assign the object to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords){
    var nVertices = vertices.length / 3;

    var o = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
    if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
    if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
    //you can have error check here
    o.numVertices = nVertices;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initCubeTexture(posXName, negXName, posYName, negYName, 
	                     posZName, negZName, imgWidth, imgHeight){
	var texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

	const faceInfos = [
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
			fName: posXName,
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
			fName: negXName,
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
			fName: posYName,
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
			fName: negYName,
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
			fName: posZName,
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
			fName: negZName,
		},
	];

	faceInfos.forEach((faceInfo) => {
		const {target, fName} = faceInfo;
		// setup each face so it's immediately renderable
		gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0, 
		gl.RGBA, gl.UNSIGNED_BYTE, null);

		var image = new Image();
		image.onload = function(){
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
			gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		};
		image.src = 'background/' + fName;
	});

	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

	return texture;
}

function initFrameBuffer(gl){
    //create and set up a texture object as the color buffer
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    //create and setup a render buffer as the depth buffer
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                            offScreenWidth, offScreenHeight);
  
    //create and setup framebuffer: linke the color and depth buffer to it
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                              gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                                gl.RENDERBUFFER, depthBuffer);
    frameBuffer.texture = texture;
    return frameBuffer;
}

function initTexture(gl, img, imgName){
    var tex = gl.createTexture();
    if(imgName === 'Steve.png') gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    else gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  
    // Set the parameters so we can render any size image.
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

    textures[imgName] = tex;
  
    texCount++;
    if( texCount == imgNames.length) draw();
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

///// normal vector calculation (for the cube)
function getNormalOnVertices(vertices){
    var normals = [];
    var nTriangles = vertices.length/9;
    for(let i=0; i < nTriangles; i ++ ){
        var idx = i * 9 + 0 * 3;
        var p0x = vertices[idx+0], p0y = vertices[idx+1], p0z = vertices[idx+2];
        idx = i * 9 + 1 * 3;
        var p1x = vertices[idx+0], p1y = vertices[idx+1], p1z = vertices[idx+2];
        idx = i * 9 + 2 * 3;
        var p2x = vertices[idx+0], p2y = vertices[idx+1], p2z = vertices[idx+2];

        var ux = p1x - p0x, uy = p1y - p0y, uz = p1z - p0z;
        var vx = p2x - p0x, vy = p2y - p0y, vz = p2z - p0z;

        var nx = uy*vz - uz*vy;
        var ny = uz*vx - ux*vz;
        var nz = ux*vy - uy*vx;

        var norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
        nx = nx / norm;
        ny = ny / norm;
        nz = nz / norm;

        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    }
    return normals;
}

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
var dir_dis = 5;
var ver_dis = 5;

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
var imgNames = ["Steve.png", "trump.png"];              // define image name
var texCount = 0;

// 3D item object
var steve = [];                                         // steve object
var trump = [];                                         // trump object
var cube = [];                                          // cube object
var ball = [];                                          // ball object
var pyramid = [];                                       // pyramid object
var cylinder = [];                                      // cylinder object
var screen = [];

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

    // define environment cubemap shader
    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);

    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position'); 
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    programEnvCube.u_viewDirectionProjectionInverse = 
               gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse'); 

    quadObj = initVertexBufferForLaterUse(gl, quad);

    cubeMapTex = initCubeTexture("posx.jpg", "negx.jpg", "posy.jpg", "negy.jpg", 
                                 "posz.jpg", "negz.jpg", 2048, 2048)

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

    // 3D model steve
    response = await fetch('steve.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i++ ){
        let o = initVertexBufferForLaterUse(gl, 
                                            obj.geometries[i].data.position,
                                            obj.geometries[i].data.normal, 
                                            obj.geometries[i].data.texcoord);
        steve.push(o);
    }

    // 3D model trump
    response = await fetch('trump.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i++ ){
        let o = initVertexBufferForLaterUse(gl, 
                                            obj.geometries[i].data.position,
                                            obj.geometries[i].data.normal, 
                                            obj.geometries[i].data.texcoord);
        trump.push(o);
    }

    // 3D model cube
    response = await fetch('cube.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i++ ){
        let o = initVertexBufferForLaterUse(gl, 
                                            obj.geometries[i].data.position,
                                            obj.geometries[i].data.normal, 
                                            obj.geometries[i].data.texcoord);
        screen.push(o);
    }

    // initialize texture
    for(let i = 0; i < imgNames.length; i++){
        let image = new Image();
        image.onload = function(){
            initTexture(gl, image, imgNames[i]);
        };
        image.src = 'texture/' + imgNames[i];
    }

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
}

function draw(){
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    drawOffScreen();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    drawOnScreen()
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
    let srcMatrix = new Matrix4();
    srcMatrix.translate(tank_x, 0.0, tank_y);
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

    // left front wheel
    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cube, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();

    // right rectangle
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();

    srcMatrix.rotate(direction, 0, 1, 0);

    // center base
    mdlMatrix.translate(3.0, 0.3, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.7, 0.3, 0.7);
    drawOneObject(cube, mdlMatrix, 0.8, 0.8, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();
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

    // left front wheel
    mdlMatrix.translate(2.0, 0.0, 0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
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
    drawOneObject(cube, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();

    // right rectangle
    mdlMatrix.translate(3.0, 0.0, -0.8);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(1.0, 0.3, 0.3);
    drawOneObject(cube, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();

    srcMatrix.rotate(direction, 0, 1, 0);

    // center base
    mdlMatrix.translate(3.0, 0.3, 0.0);
    mdlMatrix.multiply(srcMatrix);
    mdlMatrix.scale(0.7, 0.3, 0.7);
    drawOneObject(cube, mdlMatrix, 0.8, 0.8, 0.0);
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
    drawOneObject(cylinder, mdlMatrix, 0.0, 0.7, 0.0);
    mdlMatrix.setIdentity();

    mdlMatrix.translate(0, 7, -10);
    mdlMatrix.scale(7.0, 7.0, 0.1);
    drawOneObject(screen, mdlMatrix, 0.0, 0.0, 0.0, 'frame_buffer');
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

function parseOBJ(text) {
    // because indices are base 1 let's just fill in the 0th data
    const objPositions = [[0, 0, 0]];
    const objTexcoords = [[0, 0]];
    const objNormals = [[0, 0, 0]];

    // same order as `f` indices
    const objVertexData = [
        objPositions,
        objTexcoords,
        objNormals,
    ];

    // same order as `f` indices
    let webglVertexData = [
        [],   // positions
        [],   // texcoords
        [],   // normals
    ];

    const materialLibs = [];
    const geometries = [];
    let geometry;
    let groups = ['default'];
    let material = 'default';
    let object = 'default';

    const noop = () => {};

    function newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (geometry && geometry.data.position.length) {
            geometry = undefined;
        }
    }

    function setGeometry() {
        if (!geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            webglVertexData = [
                position,
                texcoord,
                normal,
            ];
            geometry = {
                object,
                groups,
                material,
                data: {
                    position,
                    texcoord,
                    normal,
                },
            };
            geometries.push(geometry);
        }
    }

    function addVertex(vert) {
        const ptn = vert.split('/');
        ptn.forEach((objIndexStr, i) => {
            if (!objIndexStr) {
            return;
            }
            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
            webglVertexData[i].push(...objVertexData[i][index]);
        });
    }

    const keywords = {
        v(parts) {
            objPositions.push(parts.map(parseFloat));
        },
        vn(parts) {
            objNormals.push(parts.map(parseFloat));
        },
        vt(parts) {
            // should check for missing v and extra w?
            objTexcoords.push(parts.map(parseFloat));
        },
        f(parts) {
            setGeometry();
            const numTriangles = parts.length - 2;
            for (let tri = 0; tri < numTriangles; ++tri) {
            addVertex(parts[0]);
            addVertex(parts[tri + 1]);
            addVertex(parts[tri + 2]);
            }
        },
        s: noop,    // smoothing group
        mtllib(parts, unparsedArgs) {
            // the spec says there can be multiple filenames here
            // but many exist with spaces in a single filename
            materialLibs.push(unparsedArgs);
        },
        usemtl(parts, unparsedArgs) {
            material = unparsedArgs;
            newGeometry();
        },
        g(parts) {
            groups = parts;
            newGeometry();
        },
        o(parts, unparsedArgs) {
            object = unparsedArgs;
            newGeometry();
        },
    };

    const keywordRE = /(\w*)(?: )*(.*)/;
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
        const line = lines[lineNo].trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const m = keywordRE.exec(line);
        if (!m) {
            continue;
        }
        const [, keyword, unparsedArgs] = m;
        const parts = line.split(/\s+/).slice(1);
        const handler = keywords[keyword];
        if (!handler) {
            console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
            continue;
        }
        handler(parts, unparsedArgs);
    }

    // remove any arrays that have no entries.
    for (const geometry of geometries) {
        geometry.data = Object.fromEntries(
            Object.entries(geometry.data).filter(([, array]) => array.length > 0));
    }

    return {
        geometries,
        materialLibs,
    };
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
