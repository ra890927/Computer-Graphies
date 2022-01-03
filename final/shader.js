var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    attribute vec2 a_NormalCoord;
    attribute vec3 a_Tagent;
    attribute vec3 a_Bitagent;
    attribute float a_crossTexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    varying vec2 v_TexCoord;
    varying vec2 v_NormalCoord;
    varying vec3 v_PositionInWorld;
    varying vec3 v_Normal;
    varying mat4 v_TBN;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
        v_NormalCoord = a_NormalCoord;
        //create TBN matrix 
        vec3 tagent = normalize(a_Tagent);
        vec3 bitagent = normalize(a_Bitagent);
        vec3 nVector;
        if( a_crossTexCoord > 0.0){
          nVector = cross(tagent, bitagent);
        } else{
          nVector = cross(bitagent, tagent);
        }
        v_TBN = mat4(
            tagent.x, tagent.y, tagent.z, 0.0, 
            bitagent.x, bitagent.y, bitagent.z, 0.0,
            nVector.x, nVector.y, nVector.z, 0.0, 
            0.0, 0.0, 0.0, 1.0
        );
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform int u_useTexture;       // whether use texture
    uniform int u_useNormal;
    uniform vec3 u_Color;           // object color
    uniform vec3 u_ViewPosition;
    uniform vec3 u_LightPosition;   // light position
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform highp mat4 u_normalMatrix;
    uniform sampler2D u_Sampler_Texture;    // texture sampler
    uniform sampler2D u_Sampler_Normal;     // texture sampler
    varying mat4 v_TBN;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying vec2 v_NormalCoord;
    void main(){
        // define light color
        vec3 ambientLightColor;
        vec3 diffuseLightColor;

        if(bool(u_useTexture)){
            // use texture color
            vec3 texColor = texture2D( u_Sampler_Texture, v_TexCoord ).rgb;
            ambientLightColor = texColor;
            diffuseLightColor = texColor;
        }
        else{
            // use specified color
            ambientLightColor = u_Color;
            diffuseLightColor = u_Color;
        }

        // define normal vector
        vec3 normal;

        if(bool(u_useNormal)){
            vec3 nMapNormal = normalize( texture2D( u_Sampler_Normal, v_NormalCoord ).rgb * 2.0 - 1.0 );
            normal = normalize( vec3( u_normalMatrix * v_TBN * vec4( nMapNormal, 1.0) ) );
        }
        else{
            normal = normalize(v_Normal);
        }

        // assume white specular light
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

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

var VSHADER_SOURCE_TEXTURE_ON_CUBE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_normalMatrix;
  varying vec4 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_Position;
    v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
    v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
  } 
`;

var FSHADER_SOURCE_TEXTURE_ON_CUBE = `
  precision mediump float;
  varying vec4 v_TexCoord;
  uniform vec3 u_ViewPosition;
  uniform vec3 u_Color;
  uniform samplerCube u_envCubeMap;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
    vec3 normal = normalize(v_Normal);
    vec3 R = reflect(-V, normal);
    gl_FragColor = vec4(0.78 * textureCube(u_envCubeMap, R).rgb + 0.3 * u_Color, 1.0);
  }
`;