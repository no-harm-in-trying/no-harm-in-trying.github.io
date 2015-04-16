var canvas = document.getElementById("canvas");
canvas.width = 800;
canvas.height = 600;
var ctx = canvas.getContext("2d");


var perlin = new Perlin();


function Filter(){
    var pkg = {};

    pkg.apply = function(imageData, filter){
        var uint8s = imageData.data;
        for (var i = 0, l = uint8s.length; i<l; i+=4){
            var colors = uint8s.subarray(i, i+4);
            filter(colors, colors);
        }
    };

    pkg.grayscale = function(out, color){
        var r = color[0];
        var g = color[1];
        var b = color[2];
        var a = color[3] || 1.0;

        var v = 0.2126*r + 0.7152*g + 0.0722*b;
        out[0] = out[1] = out[2] = v;
        out[3] = a;
        return out;
    };

    return pkg;
}

var filter = new Filter();

/**
 *
 * @param x
 * @param y
 * @param repeatWidth
 * @param repeatHeight
 * @param scale - higher the number, the "further" the observer is at
 * @param octs - number of finer detailed noise
 * @param persistence - impact of those finer detailed noise, lower -> more blurry, higher -> more pixelated
 * @returns {number}
 */
function pp(x, y, repeatWidth ,repeatHeight, scale, octs, persistence){
    var px = scale;
    var py = scale;

    x = x * scale / repeatWidth;
    y = y * scale / repeatHeight;

    var r = 0;
    for (var i = 1; i<=octs;i++){
        var f = Math.pow(2,i);
        r += perlin.periodic2(x*f,y*f,px*f,py*f) * Math.pow(persistence, i-1);
    }
    if (r > 1) return 1;
    else if (r < -1) return -1;
    return r;
}

function pp3(x, y, z, repeatWidth, repeatHeight, repeatDepth, scale, octs, persitence){
    x = x * scale / repeatWidth;
    y = y * scale / repeatHeight;
    z = z * scale / repeatDepth;

    var r = 0;
    for (var i = 1; i<=octs;i++){
        var f = Math.pow(2,i);
        r += perlin.periodic3(x*f,y*f,z*f,scale*f,scale*f,scale*f) * Math.pow(persitence, i-1);
    }

    if (r > 1) return 1;
    else if (r < -1) return -1;
    return r;
}

var colorKeys = new Interpolator();
colorKeys.dataVec(0.0, [0,0,0,0]);
colorKeys.dataVec(0.1, [25/360,0.5,0.3,255]);
colorKeys.dataVec(0.3, [15/360,0.5,0.4,255]);
colorKeys.dataVec(0.6, [20/360,0.7,0.5,255]);
colorKeys.dataVec(0.8, [45/360,1.0,0.5,255]);
colorKeys.dataVec(1.0, [60/360,1.0,0.9,255]);

var imageData = ctx.getImageData(0,0,200,200);
var data = imageData.data;
var width = imageData.width;
var height = imageData.height;

var cx = 100;
var cy = 100;

var _c = [0,0,0,0];

for (var i = 0, l = data.length; i<l; i+=4) {
    var x = (i / 4) % width;
    var y = Math.floor(i / (width * 4));

    var dx = x - cx;
    var dy = y - cy;
    var distSqr = dx * dx + dy * dy;
    var dist = 1 - (distSqr/(60*60));
    if (dist > 0) dist /= 1.2;
    var n = dist + pp(x, y, 200, 200, 2, 5, 0.6);
    if (n > 1) n = 1;
    else if (n < -1) n = -1;
    n = (n+1)/2;
    colorKeys.lerpVec(_c, n);
    colors.HSLtoRGB(_c, _c);
    data[i] = _c[0];
    data[i + 1] = _c[1];
    data[i + 2] = _c[2];
    data[i + 3] = _c[3];
}


ctx.putImageData(imageData, 0, 0);

for (i = 0, l = data.length; i<l; i+=4) {
    x = (i / 4) % width;
    y = Math.floor(i / (width * 4));

    dx = x - cx;
    dy = y - cy;
    distSqr = dx * dx + dy * dy;
    dist = 1 - (distSqr/(60*60));
    if (dist > 0) dist /= 1.2;
    n = dist + pp(x, y, 200, 200, 2, 5, 0.6);
    if (n > 1) n = 1;
    else if (n < -1) n = -1;
    n = (n+1)/2;
    var c = Math.round(n * 255);
    data[i] = c;
    data[i + 1] = c;
    data[i + 2] = c;
    data[i + 3] = 255;
}

ctx.putImageData(imageData, 0, 200);

imageData = ctx.getImageData(300, 50, 20, 200);
for (i = 0, l = imageData.data.length; i<l; i+=4) {
    x = (i / 4) % imageData.width;
    y = Math.floor(i / (imageData.width * 4));

    n = y/imageData.height;
    colorKeys.lerpVec(_c, n);
    colors.HSLtoRGB(_c, _c);
    imageData.data[i] = _c[0];
    imageData.data[i + 1] = _c[1];
    imageData.data[i + 2] = _c[2];
    imageData.data[i + 3] = 255;
}

ctx.putImageData(imageData,300,50);

var gui = new Gui.Root(ctx, null);
var drag = new gui.Draggable(gui, [200, 200],[32,32],
    shapes.rect("red",32,32),
    shapes.rect("gray",32,32),
    [100,200,200,0]
);

gui.drawAll(ctx);

var mouse = app.useCursor(canvas);
mouse.onDown = function(){
    gui.cursorDown(mouse.x, mouse.y);
};

mouse.onUp = function(){
    gui.cursorUp(mouse.x, mouse.y);
};

mouse.onMove = function(){
    gui.cursorMove(mouse.x, mouse.y);
};


function generateCloud(width ,height, dropOffRadius, hslTable){
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    var imageData = ctx.createImageData(width, height);

    var dropOffSqr = dropOffRadius * dropOffRadius;
    var data = imageData.data;
    var cx = width/2;
    var cy = height/2;
    var _colors = [0,0,0,0];
    for (var i = 0, l = data.length; i<l; i+=4) {
        var x = (i / 4) % width;
        var y = Math.floor(i / (width * 4));

        var dx = x - cx;
        var dy = y - cy;
        var distSqr = dx * dx + dy * dy;
        var dist = 1 - (distSqr/(dropOffSqr));
        if (dist > 0) dist /= 1.2;
        var n = dist + pp(x, y, width, height, 2, 5, 0.6);
        if (n > 1) n = 1;
        else if (n < -1) n = -1;
        n = (n+1)/2;
        //if (n > 0.5) n = (n-0.5)/2+0.5;

        hslTable.lerpVec(_colors, n);
        colors.HSLtoRGB(_colors, _colors);
        data[i] = _colors[0];
        data[i + 1] = _colors[1];
        data[i + 2] = _colors[2];
        data[i + 3] = _colors[3];

    }

    ctx.putImageData(imageData, 0, 0);
    return new Img(canvas, 0, 0, width, height);
}

var hslTable = new Interpolator();
hslTable.dataVec(0.0, [0,0,0,0]);
hslTable.dataVec(0.08, [0/360, 0.0, 0.5, 128]);
hslTable.dataVec(1.0, [0/360, 0.0, 1.0, 255]);

var imgCloud = generateCloud(64,64,64/3, hslTable);

imgCloud.draw(ctx, 300, 300);

var blueCloud = shapes.compositeImg(imgCloud, shapes.rect("red",64,64), 0.1);
blueCloud.draw(ctx, 300, 400);
//blueCloud.draw(ctx, 330, 400);

function generateCloudSeq(amount, width, height, dropOffRadius, hslTable){
    var imgs = [];
    var total = amount;
    while (amount --> 0){
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        var imageData = ctx.createImageData(width, height);

        var dropOffSqr = dropOffRadius * dropOffRadius;
        dropOffSqr *= (1-amount/total);
        var data = imageData.data;
        var cx = width/2;
        var cy = height/2;
        var _colors = [0,0,0,0];
        for (var i = 0, l = data.length; i<l; i+=4) {
            var x = (i / 4) % width;
            var y = Math.floor(i / (width * 4));

            var dx = x - cx;
            var dy = y - cy;
            var distSqr = dx * dx + dy * dy;
            var dist = 1 - (distSqr/(dropOffSqr));
            if (dist > 0) dist /= 1.2;
            var n = dist + pp3(x, y, amount/total, width, height, 1, 2, 5, 0.6);
            if (n > 1) n = 1;
            else if (n < -1) n = -1;
            n = (n+1)/2;

            hslTable.lerpVec(_colors, n);
            colors.HSLtoRGB(_colors, _colors);
            data[i] = _colors[0];
            data[i + 1] = _colors[1];
            data[i + 2] = _colors[2];
            data[i + 3] = _colors[3];

        }

        ctx.putImageData(imageData, 0, 0);
        var img = new Img(canvas, 0, 0, width, height);
        imgs.push(img);
    }
    return imgs;
}

var cloudImgs = generateCloudSeq(100, 64, 64, 64/3, colorKeys);

for (var i = 0, l = cloudImgs.length; i<l; i++){
    var img = cloudImgs[i];
    img.draw(ctx, 400, 0 + i * 64);
}

imageData = ctx.getImageData(0,0,200,200);
data = imageData.data;
for (i = 0, l = data.length; i<l; i+=4) {
    x = (i / 4) % width;
    y = Math.floor(i / (width * 4));

    n = perlin.periodic4(x/50, y/50, 0, 0, 4,4, 0,0);
    //n = perlin.periodic3(x/50,y/50,0.2,4,4,1);
    if (n > 1) n = 1;
    else if (n < -1) n = -1;
    n = (n+1)/2;
    c = Math.round(n * 255);
    data[i] = c;
    data[i + 1] = c;
    data[i + 2] = c;
    data[i + 3] = 255;
}

ctx.putImageData(imageData, 0, 400);

drag.onDrag = function(x, y){
    var r = (x-this._.clampRegion[0])/this._.clampRegion[2];

    ctx.clearRect(300, 400, 100, 100);
    var img = shapes.compositeImg(imgCloud, shapes.rect(colors.toHSLAString([r,1.0,0.5,1.0]),64,64), 0.3);
    img.draw(ctx, 300, 400);
};

function Animation(renderer, imgs, pos){
    this.renderer = renderer;
    this.imgs = imgs;
    this.sprite = renderer.newSprite(imgs[0], pos);
    this.pos = pos;

    this.index = 0;
}

Animation.prototype.play = function(){
    this.index += 1;
    if (this.index >= this.imgs.length) this.index = 0;
    this.sprite.img = this.imgs[this.index];
};


var renderer = new Renderer();
var anim = new Animation(renderer, cloudImgs, [550,50]);

var repeat = function(){
    anim.play();
    ctx.clearRect(500,0,100,100);
    renderer.render(ctx, 0, 0);
    setTimeout(repeat, 64);
};
repeat();
