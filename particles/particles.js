var imgPart = shapes.circle("yellow",8);

var renderer = new Renderer();

function Particle(){
    this.pos = [0,0];
    this.sprite = renderer.newSprite(imgPart, this.pos);
    this.vel = [0,0];
    this.life = 0;
    this.lifeMax = 0;
    this.delay = 0;

    this.imgs = [];
}

function Emitter(particleCount){
    this._pos = [0,0,0,0];
    this._vel = [0,0,0,0];
    this._gravity = [0,0];
    this._life = [1,1];
    this._delay = [0,0];
    this._imgs = [];

    this.particles = [];
    while (particleCount --> 0){
        this.particles.push(new Particle());
    }

    return this;
}

Emitter.prototype.init = function(){
    for (var i = 0, l = this.particles.length; i<l; i++){
        var p = this.particles[i];
        this.initParticle(p);
    }
};

Emitter.prototype.initParticle = function(p){
    vec2.fromPolar(p.pos,
        this._pos,
        app.math.randFloat(this._pos[2], this._pos[3]),
        app.math.randFloat(0,2*Math.PI)
    );

    p.vel[0] = app.math.randFloat(this._vel[0],this._vel[1]);
    p.vel[1] = app.math.randFloat(this._vel[2],this._vel[3]);

    p.lifeMax = p.life = app.math.randFloat(this._life[0], this._life[1]);
    p.delay = app.math.randFloat(this._delay[0], this._delay[1]);
    if (p.delay > 0) p.sprite.visible = false;
    p.imgs = this._imgs;
};

Emitter.prototype.update = function(dt){
    for (var i = 0, l = this.particles.length; i<l; i++){
        var p = this.particles[i];
        if (p.life <= 0) continue;

        if (p.delay > 0){
            p.delay -= dt;
            if (p.delay <=0) p.sprite.visible = true;
            else continue;
        }

        p.life -= dt;
        if (p.life <= 0){
            p.sprite.visible = false;
        }


        p.vel[0] += this._gravity[0] * dt;
        p.vel[1] += this._gravity[1] * dt;
        p.pos[0] += p.vel[0] * dt;
        p.pos[1] += p.vel[1] * dt;

        var r = p.life/ p.lifeMax;
        var index = Math.floor(r * p.imgs.length);
        p.sprite.img = p.imgs[index];

    }
};


Emitter.prototype.pos = function(x, y, minR, maxR){
    var p = this._pos;
    p[0] = x;
    p[1] = y;
    p[2] = minR;
    p[3] = maxR;

    return this;
};

Emitter.prototype.vel = function(minX, maxX, minY, maxY){
    var v = this._vel;
    v[0] = minX;
    v[1] = maxX;
    v[2] = minY;
    v[3] = maxY;

    return this;
};

Emitter.prototype.gravity = function(x, y){
    var g = this._gravity;
    g[0] = x;
    g[1] = y;
    return this;
};

Emitter.prototype.life = function(minLife, maxLife){
    var l = this._life;
    l[0] = minLife;
    l[1] = maxLife;
    return this;
};

Emitter.prototype.delay = function(minDelay, maxDelay){
    var d = this._delay;
    d[0] = minDelay;
    d[1] = maxDelay;
    return this;
};

Emitter.prototype.img = function(imgs){
    this._imgs = imgs;
    return this;
};






var colors = {};

colors.RGBtoHSL = function(out, rgb){
    var h,s,l;
    var r = rgb[0]/255;
    var g = rgb[1]/255;
    var b = rgb[2]/255;

    var min = Math.min(r,g,b);
    var max = Math.max(r,g,b);
    var delta = max - min;

    l = (max + min) / 2;
    if (delta === 0){ // gray
        h = 0;
        s = 0;
    } else {
        if (l < 0.5) s = delta / (max + min);
        else s = delta / (2 - max - min);

        if (r === max){
            h = 1/6 * ((g-b)/delta);
            if (h < 0) h += 1;
            else if (h >= 1) h -= 1;
        }

        else if (g === max)
            h = 1/6 * ((b-r)/delta + 2);
        else if (b === max)
            h = 1/6 * ((r-g)/delta + 4);
    }

    out[0] = h;
    out[1] = s;
    out[2] = l;

    return out;
};

colors.HSLtoRGB = function(out, HSL){
    var r,g,b,i,j;
    var h = HSL[0];
    var s = HSL[1];
    var l = HSL[2];

    if (s === 0){
        r = l * 255;
        g = l * 255;
        b = l * 255;
    } else {
        if (l < 0.5) j = l * ( 1 + s );
        else j = (l + s) - (s * l);

        i = 2 * l - j;

        r = 255 * this._hueToRGB(i, j, h + 1/3);
        g = 255 * this._hueToRGB(i, j, h);
        b = 255 * this._hueToRGB(i, j, h - 1/3);
    }

    out[0] = Math.round(r);
    out[1] = Math.round(g);
    out[2] = Math.round(b);
    return out;
};

colors._hueToRGB = function(i, j, h){
    if (h < 0) h += 1;
    else if (h >= 1) h -= 1;

    if (h < 1/6) return (i + (j - i) * h * 6);
    if (h < 1/2) return (j);
    if (h < 2/3) return (i + (j - i) * (2/3 - h) * 6);
    return i;
};

colors.toRBGString = function(rgb){
    var r = rgb[0].toFixed(0);
    var g = rgb[1].toFixed(0);
    var b = rgb[2].toFixed(0);
    return "rgb("+r+","+g+","+b+")";
};

colors.toRGBAString = function(rgba){
    var r = rgba[0].toFixed(0);
    var g = rgba[1].toFixed(0);
    var b = rgba[2].toFixed(0);
    var a = rgba[3].toFixed(3);
    return "rgba("+r+","+g+","+b+","+a+")";
};

colors.toHSLString = function(hsl){
    var h = (hsl[0] * 360).toFixed(0);
    var s = (hsl[1] * 100).toFixed(0)+"%";
    var l = (hsl[2] * 100).toFixed(0)+"%";
    return "hsl("+h+","+s+","+l+")";
};

colors.toHSLAString = function(hsla){
    var h = (hsla[0] * 360).toFixed(0);
    var s = (hsla[1] * 100).toFixed(0)+"%";
    var l = (hsla[2] * 100).toFixed(0)+"%";
    var a = hsla[3].toFixed(3);
    return "hsla("+h+","+s+","+l+","+a+")";
};

function FramesGenerator(){
    this.size = new Interpolator();
    this.color = new Interpolator();
}

FramesGenerator.prototype.createImgs = function(numOfFrames){
    var hsl = [];
    var size = 0;
    var step = 1.0/numOfFrames;

    var results = [];
    for (var i = 0; i<numOfFrames; i++){
        var r = step * i;
        hsl = this.color.lerpVec(hsl, r);
        if (hsl[0] < 0) hsl[0] += 1;
        else if (hsl[0] >= 1.0) hsl[0] -= 1;
        size = this.size.lerp(r);
        results.push(shapes.circle(colors.toHSLAString(hsl), size));
    }
    return results.reverse();
};


var fg = new FramesGenerator();
fg.size.dataPoint(0.0, 3);
fg.size.dataPoint(0.8, 2);
fg.size.dataPoint(1.0, 0);
fg.color.dataVec(0.0, [60/360, 1.0, 1.0, 0.0]); // white
fg.color.dataVec(0.3, [60/360, 1.0, 0.5, 0.6]); // yellow
fg.color.dataVec(0.6, [50/360, 1.0, 0.5, 0.3]); // yellow
fg.color.dataVec(0.8, [45/360, 1.0, 0.5, 0.3]);
fg.color.dataVec(1.0, [0/360, 0.0, 0.6, 0.0]); // gray

var imgs = fg.createImgs(60);

var sfg = new FramesGenerator();
sfg.size.dataPoint(0.0, 0);
sfg.size.dataPoint(0.2, 14);
sfg.size.dataPoint(0.7, 18);
sfg.size.dataPoint(0.8, 16);
sfg.size.dataPoint(1.0, 17);
sfg.color.dataVec(0.0, [60/360, 1.0, 0.9, 0.8]);
sfg.color.dataVec(0.15, [45/360, 1.0, 0.8, 0.5]);
sfg.color.dataVec(0.8, [45/360, 0.3, 0.9, 0.3]);
sfg.color.dataVec(1.0, [30/360, 0.0, 0.9, 0.0]);

var smokeImgs = sfg.createImgs(60);

var canvas = document.getElementById("canvas");
canvas.width = 800;
canvas.height = 600;
var ctx = canvas.getContext("2d");

var smoke = new Emitter(30)
    .pos(200,200,0,20)
    .vel(-30,30,-30,30)
    .gravity(0,0)
    .life(0.3,0.6)
    .delay(0, 0.2)
    .img(smokeImgs)
;

var e = new Emitter(30)
        .pos(200,200,10,15)
        .vel(-100,100,-100,100)
        .gravity(0,0)
        .life(0.2, 0.4)
        .delay(0,0.1)
        .img(imgs)
    ;



var loop = app.useLoop();
loop.flexStep = function(dt){
    dt = 0.01666;
    e.update(dt);
    smoke.update(dt);
    ctx.clearRect(0,0,800,600);
    renderer.render(ctx, 0,0);
};

app.array.shuffle(renderer.sprites);

e.init();
smoke.init();
loop.start();
