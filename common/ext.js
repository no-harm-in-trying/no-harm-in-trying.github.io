function Img(srcImage, x, y, width, height){
    this.srcImage = srcImage;
    this.x = x;
    this.y = y;
    this.width = width !== undefined ? width : srcImage.width;
    this.height = height !== undefined ? height : srcImage.height;

    this.id = Img.prototype._id++;
    Img.prototype.imgs.push(this);
}

Img.prototype._id = 0;
Img.prototype.imgs = [];
Img.prototype.draw = function(ctx, x, y){
    ctx.drawImage(this.srcImage, this.x, this.y, this.width, this.height,
        x, y, this.width, this.height
    );
};

Img.prototype.drawPartial = function(ctx, x, y, u, v, maxU, maxV){
    var ix = this.x;
    var iy = this.y;
    var iw = this.width;
    var ih = this.height;

    var pw = maxU - u;
    var ph = maxV - v;
    if (pw < 1.0 || ph < 1.0){
        ix = Math.round(ix + u * iw);
        iy = Math.round(iy + v * ih);
        iw = Math.round(iw * pw);
        ih = Math.round(ih * ph);
    }

    if (iw > 0 && ih > 0)
        ctx.drawImage(this.srcImage, ix, iy, iw, ih, x, y, iw, ih);
};

Img.prototype.newScaledImg = function(width, height){
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    //console.log(this.srcImage, this.x, this.y, this.width, this.height, 0, 0, width, height);
    ctx.drawImage(this.srcImage, this.x, this.y, this.width, this.height, 0, 0, width, height);
    return new Img(canvas, 0, 0, width, height);
};


function RotatedImg(img, stepDegrees){
    stepDegrees = stepDegrees || 3;
    this.imgs = this._createRotatedImgs(img, stepDegrees);
    this.step = stepDegrees;
}

RotatedImg.prototype._createRotatedImgs = function(img, stepDegrees){
    if (stepDegrees < 1) throw new Error("invalid step: "+stepDegrees);
    stepDegrees = Math.round(stepDegrees);
    var result = [];
    var numOfImgs = Math.floor(360/stepDegrees);
    var iw = img.width;
    var ih = img.height;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var diameter = Math.ceil(Math.sqrt(iw*iw + ih*ih));
    var center = diameter/2;
    var imgPerRow = Math.ceil(Math.sqrt(numOfImgs));
    canvas.width = imgPerRow * diameter;
    canvas.height = imgPerRow * diameter;

    var image = new Image();

    for (var i = 0; i<numOfImgs; i++){
        var r = Math.floor(i / imgPerRow);
        var c = i - r * imgPerRow;

        var radian = app.math.toRadians(i * stepDegrees);
        var x = center + c * diameter;
        var y = center + r * diameter;
        ctx.translate(x, y);
        ctx.rotate(radian);
        //ctx.drawImage(img.srcImage, -img.width/2, - img.height/2, img.width, img.height);
        img.draw(ctx, -img.width/2, - img.height/2);
        //ctx.fillRect(-1,-1,2,2); // for DEBUG - dot in center
        ctx.rotate(-radian);
        ctx.translate(-x, -y);

        result.push(new Img(
            image,
            c * diameter,
            r * diameter,
            diameter,
            diameter
        ))
    }

    image.src = canvas.toDataURL();
    return result;
};

RotatedImg.prototype.getImg = function(degrees){
    if (degrees < 0) degrees += 360;
    else if (degrees >= 360) degrees -= 360;
    return this.imgs[Math.floor(degrees/this.step)];
};


var Renderer = (function(){
    function Sprite(img, pos){
        this.img = img;
        this.pos = pos;
        this.scale = [1,1];
        this.r = 0;

        this.offset = [0,0];
        this.partial = [0,0,1,1];

        this.visible = true;
        this.id = Sprite.prototype._id++;
    }

    Sprite.prototype._id = 0;

    function SpriteGroup(renderer, size){
        this.visible = true;
        this.size = size;
        this.sprites = [];

        for (var i = 0; i<size; i++){
            var spr = new Sprite(null, null);
            spr.visible = false;
            this.sprites.push(spr);
            renderer.sprites.push(spr);
        }

        this.renderer = renderer;
        this.id = SpriteGroup.prototype._id++;
    }

    SpriteGroup.prototype._id = 0;

    SpriteGroup.prototype.getSprite = function(index){
        this.visible = true;
        if (index >= 0 && index < this.size){
            var spr = this.sprites[index];
            spr.visible = true;
            return spr;
        } else throw new Error("getSprite out of bounds: "+index);
    };

    SpriteGroup.prototype.recycle = function(){
        this.renderer.recycleGroup(this);
    };


    function Renderer(){
        this.sprites = [];
        this.recycledSpriteGroups = [];
        this.recycledSprites = [];
    }

    Renderer.prototype.newGroup = function(size){
        var recycled = this.recycledSpriteGroups[size];
        if (!recycled) recycled = this.recycledSpriteGroups[size] = [];

        if (recycled.length > 0){
            var sprGroup = recycled.pop();
        } else {
            sprGroup = new SpriteGroup(this, size);
        }

        return sprGroup;
    };

    Renderer.prototype.recycleGroup = function(sprGroup){
        sprGroup.visible = false;
        for (var i = 0, l = sprGroup.size; i<l; i++){
            var spr = sprGroup.sprites[i];
            spr.img = null;
            spr.visible = false;
        }
        this.recycledSpriteGroups[sprGroup.size].push(sprGroup);
    };

    Renderer.prototype.newSprite = function(img, pos){
        var recycled = this.recycledSprites;
        if (recycled.length > 0)
            var spr = recycled.pop();
        else {
            spr = Object.create(Sprite.prototype);
            this.sprites.push(spr);
        }
        Sprite.call(spr, img, pos);
        return spr;
    };

    Renderer.prototype.recycleSprite = function(spr){
        spr.img = null;
        spr.visible = false;
        this.recycledSprites.push(spr);
    };

    Renderer.prototype.render = function(ctx, tx, ty){
        var sprites = this.sprites;
        var floor = Math.floor;

        if (tx === undefined) tx = 0;
        if (ty === undefined) ty = 0;

        for (var i = 0, l = sprites.length; i<l; i++){
            var spr = sprites[i];
            if (spr.visible !== true) continue;

            var img = spr.img;
            var src = img.srcImage;

            var x = spr.pos[0] - spr.offset[0];
            var y = spr.pos[1] - spr.offset[1];
            var ix = img.x;
            var iy = img.y;
            var iw = img.width;
            var ih = img.height;

            x = floor(x + tx - iw/2);
            y = floor(y + ty - ih/2);

            var pw = spr.partial[2] - spr.partial[0];
            var ph = spr.partial[3] - spr.partial[1];
            if (pw < 1.0 || ph < 1.0){
                var dx = Math.round(spr.partial[0] * iw);
                var dy = Math.round(spr.partial[1] * ih);
                ix += dx;
                iy += dy;
                x += dx;
                y += dy;
                iw = Math.round(iw * pw);
                ih = Math.round(ih * ph);
            }

            if (iw > 0 && ih > 0)
                ctx.drawImage(src, ix, iy, iw, ih, x, y, iw, ih);
        }
    };

    return Renderer;
}());


function Bar(bgSprite, fgSprite, pos, size, offset, bgImg, fgImg){
    this.pos = pos;
    this.size = size;
    this.offset = offset;

    this.fgSprite = fgSprite;
    this.bgSprite = bgSprite;
    this.bgSprite.pos = pos;
    this.fgSprite.pos = pos;
    this.bgSprite.offset = offset;
    this.fgSprite.offset = offset;
    this.bgSprite.img = bgImg;
    this.fgSprite.img = fgImg;

    this.padding = 2; // in pixels
    this.fgSprite.partial[0] = this.padding/size[0];
    this.fgSprite.partial[2] = 1 - this.padding/size[0];
    this.fgSprite.partial[1] = this.padding/size[1];
    this.fgSprite.partial[3] = 1 - this.padding/size[1];

    this.filled = 1;
}

Bar.prototype.setFill = function(current, max){
    this.filled = app.math.clamp(current/max, 0.0, 1.0);
    console.log(this.filled);
    var w = this.size[0];
    var p = this.padding;
    var s = this.fgSprite.partial[0];
    this.fgSprite.partial[2] = (1-2*s)*this.filled+s;
    console.log(this.fgSprite.partial);
};

Bar.prototype.setVisibility = function(bool){
    this.fgSprite.visible = bool;
    this.bgSprite.visible = bool;
};




var shapes = {};

shapes.toImage = function(canvas){
    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
};

shapes.rect = function(fillColor, width, height, strokeColor, outlineWidth){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = width !== undefined ? width : 32;
    canvas.height = height !== undefined ? height : 32;
    ctx.fillStyle = fillColor;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (strokeColor){
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = outlineWidth || 1;
        ctx.strokeRect(0,0,canvas.width,canvas.height);
    }

    var image = this.toImage(canvas);
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

shapes.circle = function(fillColor, radius, strokeColor, outlineWidth){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = Math.ceil(radius * 2);
    canvas.height = Math.ceil(radius * 2);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, radius, 0, 2*Math.PI);
    ctx.closePath();
    ctx.fill();
    if (strokeColor){
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = outlineWidth || 1;
        ctx.stroke();
    }

    var image = this.toImage(canvas);
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

shapes.sphere = function(fillColor, radius, hardness){
    if (hardness === undefined) hardness = 0.5;

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = Math.ceil(radius * 2);
    canvas.height = Math.ceil(radius * 2);

    var cx = canvas.width/2;
    var cy = canvas.width/2;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2*Math.PI);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1.0, "rgba(0,0,0,"+hardness.toFixed(3)+")");

    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = grd;
    ctx.fill();

    var image = this.toImage(canvas);
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

shapes.corners = function(fillColor, width, height, cornerLength, lineWidth){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = width !== undefined ? width : 32;
    canvas.height = height !== undefined ? height : 32;
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = lineWidth || 2;
    cornerLength = cornerLength || 6;
    cornerLength = Math.min(width/2, height/2, cornerLength);
    // top left
    ctx.moveTo(1, 1+cornerLength);
    ctx.lineTo(1, 1);
    ctx.lineTo(1+cornerLength, 1);
    // top right
    ctx.moveTo(width-1-cornerLength, 1);
    ctx.lineTo(width-1, 1);
    ctx.lineTo(width-1, 1+cornerLength);
    // bottom right
    ctx.moveTo(width-1, height-1-cornerLength);
    ctx.lineTo(width-1, height-1);
    ctx.lineTo(width-1-cornerLength, height-1);
    // bototm left
    ctx.moveTo(1+cornerLength, height-1);
    ctx.lineTo(1, height-1);
    ctx.lineTo(1, height-1-cornerLength);
    ctx.moveTo(1, 1+cornerLength);
    ctx.closePath();
    ctx.stroke();

    var image = this.toImage(canvas);
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

shapes.rightTriangle = function(fillColor, width, height, strokeColor, outlineWidth){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = width !== undefined ? width : 32;
    canvas.height = height !== undefined ? height : 32;
    ctx.fillStyle = fillColor;

    ctx.moveTo(1,1);
    ctx.lineTo(1,height-1);
    ctx.lineTo(width-1,height/2);
    ctx.closePath();
    ctx.fill();
    if (strokeColor){
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = outlineWidth || 1;
        ctx.stroke();
    }

    var image = this.toImage(canvas);
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

shapes.addBorderToImg = function(img, color, lineWidth){
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    img.draw(ctx,0,0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeRect(0,0,canvas.width,canvas.height);

    return new Img(canvas, 0, 0, canvas.width, canvas.height);
};

shapes.compositeImg = function(srcImg, overlayImg, alpha){
    var canvas = document.createElement("canvas");
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    var ctx = canvas.getContext("2d");
    srcImg.draw(ctx,0,0);
    ctx.globalAlpha = alpha || 1.0;
    ctx.globalCompositeOperation = "source-atop";
    overlayImg.draw(ctx,0,0);

    return new Img(canvas, 0, 0, canvas.width, canvas.height);
};

shapes.fill = function(srcImg, fillColor, fillAlpha){
    var canvas = document.createElement("canvas");
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    var ctx = canvas.getContext("2d");
    srcImg.draw(ctx, 0, 0);
    ctx.globalAlpha = fillAlpha || 1.0;
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = fillColor;
    ctx.fill(0,0,canvas.width,canvas.height);

    return new Img(canvas, 0, 0, canvas.width, canvas.height);
};



var paths = {};

paths.roundRect = function(ctx,x,y,width,height,radius){
    if (radius === undefined) radius = 5;
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};


function HashArray(){
    this.hash = {};
    this.array = [];
    this.length = 0;
}

HashArray.prototype.insert = function(elem, id){
    id = id !== undefined ? id : elem.id;
    if (id === undefined)
        throw new Error("HashArray requires all elems has unique .id property");
    this.array.push(elem);
    this.hash[id] = this.array.length-1;
    this.length = this.array.length;
};

HashArray.prototype.remove = function(elem, id){
    id = id !== undefined ? id : elem.id;
    var i = this.hash[id];
    //console.log(i, this.array, this.hash);
    if (i>=0){
        app.array.swapDelete(this.array, i);
        if (i < this.array.length) // not last element
            this.hash[this.array[i].id] = i;
        delete this.hash[id];
    }
    this.length = this.array.length;
};

HashArray.prototype.contains = function(elem, id){
    id = id !== undefined ? id : elem.id;
    return this.hash[id] !== undefined;
};

HashArray.prototype.getArray = function(){
    return this.array;
};

HashArray.prototype.empty = function(){
    this.array.length = 0;
    this.length = 0;
    this.hash = {}; // lazy way (and perhaps bad) to clear it by allocating a new obj
};



function SpatialHashGrid(gridSize, numberOfCells){
    this.gridSize = gridSize;
    this.numberOfCells = numberOfCells;
    if (!app.math.isPowerOf2(this.numberOfCells)) throw new Error("number of cells should be a power of 2 for maximal performance");
    this.cells = [];
    while (numberOfCells --> 0){
        this.cells.push(new HashArray());
    }

    this.hashArray = new HashArray();
    this.objCells = {};
}

SpatialHashGrid.prototype._fastmod = app.math.fastModPowOf2;
SpatialHashGrid.prototype._prime1 = 654257;
SpatialHashGrid.prototype._prime2 = 851677;

SpatialHashGrid.prototype.hash = function(i, j){
    return this._fastmod((i*this._prime1 + j*this._prime2), this.numberOfCells);
};

SpatialHashGrid.prototype._getIJ = function(i,j){
    var index = this.hash(i,j);
    return this.cells[index];
};

SpatialHashGrid.prototype._getXY = function(x,y){
    var floor = Math.floor;
    var size = this.gridSize;
    var i = floor(x/size);
    var j = floor(y/size);

    var index = this.hash(i,j);
    return this.cells[index];
};


SpatialHashGrid.prototype.getCellIJ = function(i,j){
    return this._getIJ(i,j).array;
};

SpatialHashGrid.prototype.getCellXY = function(x,y){
    return this._getXY(x,y).array;
};

SpatialHashGrid.prototype.insert = function(obj){
    if (obj.id === undefined || obj.pos === undefined) throw new Error("objects in a spatial hash grid must has .id and .pos property");
    var cell = this._getXY(obj.pos[0], obj.pos[1]);
    cell.insert(obj);
    this.hashArray.insert(obj);
    this.objCells[obj.id] = cell;
};

SpatialHashGrid.prototype.remove = function(obj){
    if (!this.hashArray.contains(obj)) return; // fail silently
    var cell = this._getXY(obj.pos[0], obj.pos[1]);
    cell.remove(obj);
    var i = this.hashArray.hash[obj.id];
    this.hashArray.remove(obj);
    delete this.objCells[obj.id];
};


SpatialHashGrid.prototype.getAll = function(){
    return this.hashArray.array;
};

SpatialHashGrid.prototype.updateObjCells = function(){
    var objects = this.getAll();
    for (var i = 0, l=objects.length; i<l; i++){
        var obj = objects[i];
        var newCell = this._getXY(obj.pos[0], obj.pos[1]);
        var prevCell = this.objCells[obj.id];
        if (newCell !== prevCell){
            prevCell.remove(obj);
            newCell.insert(obj);
            this.objCells[obj.id] = newCell;
        }
    }
};

SpatialHashGrid.prototype.getClosest = function(x, y, maxDist, additionalRequirements){
    var floor = Math.floor;
    var size = this.gridSize;
    var distSqr = maxDist*maxDist;
    var picked = null;

    // can probably improve performance by searching outward in spiral rather than a box
    for (var i = floor((x-maxDist)/size), ii = floor((x+maxDist)/size); i<=ii; i++){ // NOTE THE <= !!!
        for (var j = floor((y-maxDist)/size), jj = floor((y+maxDist)/size); j<=jj; j++){
            var cell = this.getCellIJ(i,j);

            for (var k = 0, l = cell.length; k<l; k++){
                var o = cell[k];

                var dx = o.pos[0] - x;
                var dy = o.pos[1] - y;

                var thisDistSqr = dx*dx + dy*dy;
                if (additionalRequirements && !additionalRequirements(o)) continue;
                if (thisDistSqr < distSqr){
                    distSqr = thisDistSqr;
                    picked = o;
                }
            }
        }
    }

    return picked;
};

SpatialHashGrid.prototype.getAllInRect = function(out, x, y, w, h, additionalRequirements){
    var floor = Math.floor;
    var size = this.gridSize;

    out.length = 0; // empty it

    for (var i = floor(x/size), ii = floor((x+w)/size); i<=ii; i++){ // NOTE THE <= !!!!
        for (var j = floor(y/size), jj = floor((y+h)/size); j<=jj; j++){
            var cell = this.getCellIJ(i,j);

            for (var k = 0, l = cell.length; k<l; k++){
                var o = cell[k];
                var _x = o.pos[0];
                var _y = o.pos[1];

                if (_x >= x && _y >= y && _x <= (x+w) && _y <= (y+h)){
                    if (additionalRequirements && !additionalRequirements(o)) continue;
                    out.push(o);
                }
            }
        }
    }

    return out;
};

function TrailCanvas(width, height, alphaStep){
    this.width = width;
    this.height = height;
    this.alphaStep = alphaStep || 0.9;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.globalAlpha = this.alphaStep;

    this.otherCanvas = document.createElement("canvas");
    this.otherCtx = this.otherCanvas.getContext("2d");
    this.otherCanvas.width = width;
    this.otherCanvas.height = height;
    this.otherCtx.globalAlpha = this.alphaStep;
}

TrailCanvas.prototype.draw = function(ctx){
    ctx.drawImage(this.canvas, 0, 0);

    this.otherCtx.globalAlpha = this.alphaStep;
    this.otherCtx.drawImage(this.canvas, 0, 0);
    this.ctx.clearRect(0,0,this.width,this.height);

    // swap canvas and context
    var oCtx = this.otherCtx;
    var oCanvas = this.otherCanvas;
    this.otherCtx = this.ctx;
    this.otherCanvas = this.canvas;
    this.ctx = oCtx;
    this.canvas = oCanvas;
    this.ctx.globalAlpha = 1;
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
