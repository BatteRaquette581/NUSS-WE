/*#if GL_ES
precision mediump float;
#else
precision highp float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

float non_periodic_1d_noise(float x) {
    return sin(2.0 * x) + cos(3.141592653 * x);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p1 = vec2(non_periodic_1d_noise(u_time / 2.3), non_periodic_1d_noise(u_time / 2.3 + 1.0));
    vec2 p2 = -vec2(non_periodic_1d_noise(u_time / 2.3 + 2.0), non_periodic_1d_noise(u_time / 2.3 + 3.0));
    float r = clamp(distance(uv, p1), 0.0, 1.0) * clamp(distance(uv, p2), 0.0, 1.0);
    float g = clamp(distance(uv, p1), 0.0, 1.0);
    float b = clamp(distance(uv, p2), 0.0, 1.0);

    gl_FragColor = vec4(r, g, b, 1);
}
*/

/*

	Raymarched Hexagonal Truchet
	----------------------------

	Raymarching a hexagonal Truchet pattern. The Truchet pattern itself is pretty easy to produce.
	This particular production method is based off of one of Fabrice Neyret's finely tuned examples, 
	which in turn was based on something Mattz did a while back. Both examples are below.

	Technically, there isn't a lot to it. The hardest part was producing the Truchet pattern in a 
	reasonably quick way, but most of that was already done for me. Therefore, since I had nothing new 
	to add, I prettied it up a bit... and by that I mean, I made it really shiny. Probably too shiny. 
	It kind of hurts my eyes. :)

	The weird, abstract, dragon disco style wasn't intentional. I'm briefly passing through parts of 
	Asia next week, so that may have mildy influenced my style choices. Hopefully, it meets 
	834144373's approval. :)
	

	Based on:

	hexagonal truchet ( 352 ) - FabriceNeyret2
	https://www.shadertoy.com/view/Xdt3D8

	... which, in turn, was based on:
	hexagonal tiling - mattz
	https://www.shadertoy.com/view/4d2GzV

*/


// Using a 2D Hexagonal Truchet pattern as the source of the height map. This is based on Fabrice's 
// example which in turn was based on one by Mattz. I tailored it to suit my needs - and hopefully, 
// sped it up a bit, but it wouldn't shock me if I'd slowed it down instead. :)
//
// The process is pretty simple: Break space up into hexagons and color them according to the distance 
// from the center, then randomly flip some about the X-axis. The pattern you're left with isn't that 
// visually appealing. However, once you wrap or fold the values over, you get some nice symmetrical 
// patterns.
// 
// Just to complicate things slightly, I'm performing the final value folding steps outside of this
// function in order to color things in sections... It's not that important.

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

// CC0: Starry planes
//  Revisited ye olde "plane-marcher".
//  A simple result that I think turned out pretty nice

#define TIME        u_time

#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

const float
  pi        = acos(-1.)
, tau       = 2.*pi
, planeDist = .5
, furthest  = 16.
, fadeFrom  = 8.
;

const vec2 
  pathA = vec2(.31, .41)
, pathB = vec2(1.0,sqrt(0.5))
;

const vec4 
  U = vec4(0, 1, 2, 3)
  ;
  
// License: Unknown, author: Matt Taylor (https://github.com/64), found: https://64.github.io/tonemapping/
vec3 aces_approx(vec3 v) {
  v = max(v, 0.0);
  v *= 0.6;
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((v*(a*v+b))/(v*(c*v+d)+e), 0.0, 1.0);
}

vec3 offset(float z) {
  return vec3(pathB*sin(pathA*z), z);
}

vec3 doffset(float z) {
  return vec3(pathA*pathB*cos(pathA*z), 1.0);
}

vec3 ddoffset(float z) {
  return vec3(-pathA*pathA*pathB*sin(pathA*z), 0.0);
}

vec4 alphaBlend(vec4 back, vec4 front) {
  // Based on: https://en.wikipedia.org/wiki/Alpha_compositing
  float w = front.w + back.w*(1.0-front.w);
  vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/w;
  return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

// License: MIT, author: Inigo Quilez, found: https://www.iquilezles.org/www/articles/smin/smin.htm
float pmin(float a, float b, float k) {
  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

float pmax(float a, float b, float k) {
  return -pmin(-a, -b, k);
}

float pabs(float a, float k) {
  return -pmin(a, -a, k);
}

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/distfunctions2d/
//   Slightly tweaked to round the inner corners
float star5(vec2 p, float r, float rf, float sm) {
  p = -p;
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x,k1.y);
  p.x = abs(p.x);
  p -= 2.0*max(dot(k1,p),0.0)*k1;
  p -= 2.0*max(dot(k2,p),0.0)*k2;
  p.x = pabs(p.x, sm);
  p.y -= r;
  vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0,1);
  float h = clamp( dot(p,ba)/dot(ba,ba), 0.0, r );
  return length(p-ba*h) * sign(p.y*ba.x-p.x*ba.y);
}

vec3 palette(float n) {
  return 0.5+0.5*sin(vec3(0.,1.,2.)+n);
}

vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, float pd, vec3 cp, vec3 off, float n) {

  float aa = 3.*pd*distance(pp.xy, npp.xy);
  vec4 col = vec4(0.);
  vec2 p2 = pp.xy;
  p2 -= offset(pp.z).xy;
  vec2 doff   = ddoffset(pp.z).xz;
  vec2 ddoff  = doffset(pp.z).xz;
  float dd = dot(doff, ddoff);
  p2 *= ROT(dd*pi*5.);

  float d0 = star5(p2, 0.45, 1.6,0.2)-0.02;
  float d1 = d0-0.01;
  float d2 = length(p2);
  const float colp = pi*100.;
  float colaa = aa*200.;
  
  col.xyz = palette(0.5*n+2.*d2)*mix(0.5/(d2*d2), 1., smoothstep(-0.5+colaa, 0.5+colaa, sin(d2*colp)))/max(3.*d2*d2, 1E-1);
  col.xyz = mix(col.xyz, vec3(2.), smoothstep(aa, -aa, d1)); 
  col.w = smoothstep(aa, -aa, -d0);
  return col;

}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
  float lp = length(p);
  vec2 np = p + 1./u_resolution;
  float rdd = 2.0-0.25;
  
  vec3 rd = normalize(p.x*uu + p.y*vv + rdd*ww);
  vec3 nrd = normalize(np.x*uu + np.y*vv + rdd*ww);

  float nz = floor(ro.z / planeDist);

  vec4 acol = vec4(0.0);

  vec3 aro = ro;
  float apd = 0.0;

  for (float i = 1.; i <= furthest; ++i) {
    if ( acol.w > 0.95) {
      // Debug col to see when exiting
      // acol.xyz = palette(i); 
      break;
    }
    float pz = planeDist*nz + planeDist*i;

    float lpd = (pz - aro.z)/rd.z;
    float npd = (pz - aro.z)/nrd.z;
    float cpd = (pz - aro.z)/ww.z;

    {
      vec3 pp = aro + rd*lpd;
      vec3 npp= aro + nrd*npd;
      vec3 cp = aro+ww*cpd;

      apd += lpd;

      vec3 off = offset(pp.z);

      float dz = pp.z-ro.z;
      float fadeIn = smoothstep(planeDist*furthest, planeDist*fadeFrom, dz);
      float fadeOut = smoothstep(0., planeDist*.1, dz);
      float fadeOutRI = smoothstep(0., planeDist*1.0, dz);

      float ri = mix(1.0, 0.9, fadeOutRI*fadeIn);

      vec4 pcol = plane(ro, rd, pp, npp, apd, cp, off, nz+i);

      pcol.w *= fadeOut*fadeIn;
      acol = alphaBlend(pcol, acol);
      aro = pp;
    }
    
  }

  return acol.xyz*acol.w;

}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 r = u_resolution.xy, q = fragCoord/r, pp = -1.0+2.0*q, p = pp;
  p.x *= r.x/r.y;

  float tm  = planeDist*TIME;

  vec3 ro   = offset(tm);
  vec3 dro  = doffset(tm);
  vec3 ddro = ddoffset(tm);

  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(U.xyx+ddro, ww));
  vec3 vv = cross(ww, uu);
  
  vec3 col = color(ww, uu, vv, ro, p);
  col = aces_approx(col);
  col = sqrt(col);
  fragColor = vec4(col, 1);
}

void main() {
    vec4 fragColor = vec4(0.0);
    mainImage(fragColor, gl_FragCoord.xy);
    gl_FragColor = fragColor;
}