import type * as THREE from 'three'

export interface Growth {
  /** Алғашқы дана өсе бастайтын сәт (сахна ашылғаннан бергі секунд). */
  start?: number
  /** Толқынның таралуы: орталықтан әр бірлік қашықтыққа қосылатын кідіріс (секунд). */
  spread?: number
  /** Бір дананың өсу ұзақтығы (секунд). */
  time?: number
  /** Өсу барысында өз осінен бұралу бұрышы (радиан). */
  twist?: number
}

export interface LivingUniforms {
  uTime: { value: number }
  uAge: { value: number }
  uWind: { value: number }
  uGrow: { value: THREE.Vector4 }
}

/**
 * Кез келген стандартты материалды «тірі» етеді (шейдерге қосымша, жарықтандыру өзгермейді):
 *  · жел — өсімдік түбінен ұшына қарай күшейе тербеледі, әр дананың фазасы өзгеше, желдің екпіні толқынмен өтеді;
 *  · өсу — әр дана өз кезегінде нөлден бұрала үлкейіп шығады (гүлдің ашылуы, папоротниктің жайылуы).
 * Бәрі vertex шейдерде есептеледі: процессорға салмақ түспейді, InstancedMesh бір draw call күйінде қалады.
 */
export function makeLiving(material: THREE.Material, uniforms: LivingUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uTime;
        uniform float uAge;
        uniform float uWind;
        uniform vec4 uGrow; // start, spread, time, twist`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 livingOrigin = instanceMatrix[3].xyz;
          float livingScale = length(instanceMatrix[1].xyz);
        #else
          vec3 livingOrigin = vec3(0.0);
          float livingScale = 1.0;
        #endif
        float livingPhase = livingOrigin.x * 0.37 + livingOrigin.z * 0.53;
        if (uGrow.z > 0.0) {
          float wait = uGrow.x + length(livingOrigin.xz) * uGrow.y + fract(livingPhase * 7.31) * 0.7;
          float g = clamp((uAge - wait) / uGrow.z, 0.0, 1.0);
          // Сәл асып барып орнына келетін өсу
          float u = g - 1.0;
          float ge = 1.0 + u * u * (2.6 * u + 1.6);
          float ang = (1.0 - g) * (1.0 - g) * uGrow.w;
          float cs = cos(ang);
          float sn = sin(ang);
          transformed.xz = vec2(transformed.x * cs - transformed.z * sn, transformed.x * sn + transformed.z * cs);
          transformed *= max(ge, 0.0001);
        }`,
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        if (uWind > 0.0) {
          float hgt = max(transformed.y, 0.0) * livingScale;
          float gust = 0.55 + 0.45 * sin(uTime * 0.45 - livingOrigin.x * 0.22 - livingOrigin.z * 0.1);
          float sway = (0.35 + sin(uTime * 1.25 + livingPhase) * 0.6 + sin(uTime * 2.9 + livingPhase * 1.9) * 0.22) * gust;
          float bend = uWind * pow(hgt, 1.5) * sway;
          mvPosition.x += bend;
          mvPosition.z += bend * 0.4 + uWind * hgt * sin(uTime * 1.9 + livingPhase * 2.3) * 0.25;
        }
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      )
  }
  material.customProgramCacheKey = () => 'living'
  material.needsUpdate = true
}
