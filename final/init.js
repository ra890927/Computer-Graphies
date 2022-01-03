var texCount = 0;

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

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords, tagents, bitagents, crossTexCoords){
    var nVertices = vertices.length / 3;

    var o = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
    if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
    if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
    if( tagents != null ) o.tagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(tagents), 3, gl.FLOAT);
    if( bitagents != null ) o.bitagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(bitagents), 3, gl.FLOAT);
    if( crossTexCoords != null ) o.crossTexCoordsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(crossTexCoords), 1, gl.FLOAT);
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

function initFrameBufferForCubemapRendering(gl){
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  
    // 6 2D textures
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    for (let i = 0; i < 6; i++) {
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 
                    gl.RGBA, offScreenWidth, offScreenHeight, 0, gl.RGBA, 
                    gl.UNSIGNED_BYTE, null);
    }
  
    //create and setup a render buffer as the depth buffer
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                            offScreenWidth, offScreenHeight);
  
    //create and setup framebuffer: linke the depth buffer to it (no color buffer here)
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                                gl.RENDERBUFFER, depthBuffer);
  
    frameBuffer.texture = texture;
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
    return frameBuffer;
}

function initTexture(gl, img, imgName){
    var tex = gl.createTexture();
    if(imgName === 'Steve.png') gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    else gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

    textures[imgName] = tex;
  
    texCount++;
    if( texCount == imgNames.length) draw();
}

async function loadOBJtoCreateVBO( objFile ){
    let objComponents = [];
    response = await fetch('object/' + objFile);
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
        let tagentSpace = calculateTangentSpace(
            obj.geometries[i].data.position, 
            obj.geometries[i].data.texcoord
        );

        let o = initVertexBufferForLaterUse(gl, 
            obj.geometries[i].data.position,
            obj.geometries[i].data.normal, 
            obj.geometries[i].data.texcoord,
            tagentSpace.tagents,
            tagentSpace.bitagents,
            tagentSpace.crossTexCoords
        );
        
        objComponents.push(o);
    }
    return objComponents;
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

function calculateTangentSpace(position, texcoord){
    //iterate through all triangles
    let tagents = [];
    let bitagents = [];
    let crossTexCoords = [];

    for( let i = 0; i < position.length / 9; i++ ){
        let v00 = position[i*9 + 0];
        let v01 = position[i*9 + 1];
        let v02 = position[i*9 + 2];
        let v10 = position[i*9 + 3];
        let v11 = position[i*9 + 4];
        let v12 = position[i*9 + 5];
        let v20 = position[i*9 + 6];
        let v21 = position[i*9 + 7];
        let v22 = position[i*9 + 8];
        let uv00 = texcoord[i*6 + 0];
        let uv01 = texcoord[i*6 + 1];
        let uv10 = texcoord[i*6 + 2];
        let uv11 = texcoord[i*6 + 3];
        let uv20 = texcoord[i*6 + 4];
        let uv21 = texcoord[i*6 + 5];
    
        let deltaPos10 = v10 - v00;
        let deltaPos11 = v11 - v01;
        let deltaPos12 = v12 - v02;
        let deltaPos20 = v20 - v00;
        let deltaPos21 = v21 - v01;
        let deltaPos22 = v22 - v02;
    
        let deltaUV10 = uv10 - uv00;
        let deltaUV11 = uv11 - uv01;
        let deltaUV20 = uv20 - uv00;
        let deltaUV21 = uv21 - uv01;
    
        let r = 1.0 / (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20);
        for( let j=0; j< 3; j++ )
            crossTexCoords.push( (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20) );

        let tangentX = (deltaPos10 * deltaUV21 - deltaPos20 * deltaUV11)*r;
        let tangentY = (deltaPos11 * deltaUV21 - deltaPos21 * deltaUV11)*r;
        let tangentZ = (deltaPos12 * deltaUV21 - deltaPos22 * deltaUV11)*r;
        
        for( let j = 0; j < 3; j++ ){
            tagents.push(tangentX);
            tagents.push(tangentY);
            tagents.push(tangentZ);
        }

        let bitangentX = (deltaPos20 * deltaUV10 - deltaPos10 * deltaUV20)*r;
        let bitangentY = (deltaPos21 * deltaUV10 - deltaPos11 * deltaUV20)*r;
        let bitangentZ = (deltaPos22 * deltaUV10 - deltaPos12 * deltaUV20)*r;
        
        for( let j = 0; j < 3; j++ ){
            bitagents.push(bitangentX);
            bitagents.push(bitangentY);
            bitagents.push(bitangentZ);
        }
    }

    let obj = {};
    obj['tagents'] = tagents;
    obj['bitagents'] = bitagents;
    obj['crossTexCoords'] = crossTexCoords;
    
    return obj;
}