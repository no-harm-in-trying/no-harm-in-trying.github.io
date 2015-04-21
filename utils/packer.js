var canvas = document.getElementById("canvas");
canvas.width = 1600;
canvas.height = 800;
var ctx = canvas.getContext("2d");

function Packer(){
    this.usedWidth = 0;
    this.usedHeight = 0;
    this.regions = [];

    this.packData = {}; // this can be convert to json directly
    this.packedImgs = {}; // this is not serializable

    this._debug = false;
}


Packer.prototype.pack = function(imgs){
    this.usedWidth = 0;
    this.usedHeight = 0;
    this.regions = [];

    this.packData = {}; // this can be convert to json directly
    this.packedImgs = {}; // this is not serializable
    imgs = imgs.sort(function(e,e1){return e1.height - e.height});


    for (var i = 0, l = imgs.length; i<l; i++){
        var img = imgs[i];

        var r = this.findRegion(img);
        if (r === null){
            if (this.usedWidth +img.width < this.usedHeight +img.height)
                r = this.growRight(img);
            else
                r = this.growDown(img);

        }

        var name = this.getUniqueName(img.name || "image#" + img.id);

        this.packData[name] = {
            x: r[0],
            y: r[1],
            width: img.width,
            height: img.height
        };

        this.packedImgs[name] = img;

        //if (this._debug)
        //    ctx.fillText(i.toFixed(0), r[0], r[1]+20);

        if (r[2] > img.width)
            this.divideVert(r, img);
        else
            this.divideHor(r, img);

    }

    return this.packData;
};

Packer.prototype.divideVert = function(region, img){
    var x = region[0];
    var y = region[1];
    var w = region[2];
    var h = region[3];

    var topRegion = region;
    topRegion[0] = x + img.width;
    topRegion[1] = y;
    topRegion[2] = w - img.width;
    topRegion[3] = img.height;

    var botRegion = [];
    botRegion[0] = x;
    botRegion[1] = y + img.height;
    botRegion[2] = w;
    botRegion[3] = h - img.height;

    if (topRegion[2] === 0 || topRegion[3] === 0){
        app.array.remove(this.regions, topRegion);
    }

    if (botRegion[2] !== 0 && botRegion[3] !== 0)
        this.regions.push(botRegion);
};

Packer.prototype.divideHor = function(region, img){
    var x = region[0];
    var y = region[1];
    var w = region[2];
    var h = region[3];

    var leftRegion = region;
    leftRegion[0] = x;
    leftRegion[1] = y + img.height;
    leftRegion[2] = img.width;
    leftRegion[3] = h - img.height;

    var rightRegion = [];
    rightRegion[0] = x + img.width;
    rightRegion[1] = y;
    rightRegion[2] = w - img.width;
    rightRegion[3] = h;

    if (leftRegion[2] === 0 || leftRegion[3] === 0){
        app.array.removeElem(this.regions,leftRegion);
    }

    if (rightRegion[2] !== 0 && rightRegion[3] !== 0)
        this.regions.push(rightRegion);
};

Packer.prototype.canFit = function(region, img){
    return (img.width <= region[2] && img.height <= region[3]);
};

Packer.prototype.findRegion = function(img){
    var regions = this.regions;
    for (var i = 0, l = regions.length; i<l; i++){
        var r = regions[i];
        if (this.canFit(r, img)) return r;
    }
    return null;
};

Packer.prototype.growRight = function(img){
    var regions = this.regions;
    var usedHeight = this.usedHeight;
    if (img.height > usedHeight){
        // make regions whoms y+height === usedHeight larger
        var newHeight = img.height;
        for (var i = 0, l = regions.length; i<l; i++){
            var r = regions[i];
            if (r[1] + r[3] === usedHeight){
                r[3] = newHeight - r[1];
            }
        }
        this.usedHeight = img.height;
    }
    var newRegion = [this.usedWidth, 0, img.width, this.usedHeight];
    regions.push(newRegion);
    this.usedWidth += img.width;
    return newRegion;
};

Packer.prototype.growDown = function(img){
    var regions = this.regions;
    var usedWidth = this.usedWidth;
    if (img.width > usedWidth){
        // make regions whoms x+width === usedWidth larger
        var newWidth = img.width;
        for (var i = 0, l = regions.length; i<l; i++){
            var r = regions[i];
            if (r[0] + r[2] === usedWidth){
                r[2] = newWidth - r[0];
            }
        }
        this.usedWidth = img.width;
    }
    var newRegion = [0, this.usedHeight, this.usedWidth, img.height];
    regions.push(newRegion);
    this.usedHeight += img.height;
    return newRegion;
};

Packer.prototype.getUniqueName = function(name){
    var testname = name;
    var i = 0;
    while (this.packData[testname]){
        testname = name + " ("+ i.toFixed(0)+")";
        i ++;
    }
    return testname;
};

Packer.prototype.getImg = function(){
    var canvas = document.createElement("canvas");
    canvas.width = this.usedWidth;
    canvas.height = this.usedHeight;
    var ctx = canvas.getContext("2d");

    var imgNames = Object.keys(this.packData);
    for (var i = 0, l = imgNames.length; i<l; i++){
        var name = imgNames[i];
        var d = this.packData[name];
        var img = this.packedImgs[name];
        var x = d.x;
        var y = d.y;

        if (img.draw)
            img.draw(ctx, x, y);
        else // if image is canvas or HTMLImage element
            ctx.drawImage(img, x, y);
    }

    if (this._debug){
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        for (i = 0, l = this.regions.length; i<l; i++){
            var r = this.regions[i];
            ctx.fillRect(r[0], r[1], r[2], r[3]);
            ctx.strokeRect(r[0], r[1], r[2], r[3]);
        }
    }

    return new Img(canvas, 0, 0, canvas.width, canvas.height);
};

Packer.prototype.getJson = function(sheetname){
    if (sheetname === undefined) sheetname = "spritesheet";
    var json = {};
    json[sheetname] = this.packData;
    return JSON.stringify(json);
};

// to handle the problem that sometimes wishes to reuse the same img but under a different name
// supports draw method
function NamedImg(img, name){
    this.name = name;
    this.img = img;
}

NamedImg.prototype.draw = function(ctx, x, y){
    this.img.draw(ctx, x, y);
};



var assets = {
    onload: function(){},
    toLoad: 0,
    loaded: 0,
    images: [],
    imagesObj: {},
    spritesheets: [],
    spritesheetsObj: {}
};

assets.loadImageFile = function(f){
    if (!f.type.match(/image.*/)) return;
    assets.toLoad += 1;
    var reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = function(){
        console.log("read image done: "+ f.name);
        var image = new Image();
        image.src = reader.result;
        image.name = f.name;
        assets.images.push(image);
        assets.imagesObj[image.name] = image;
        assets.loaded += 1;
        if (assets.loaded === assets.toLoad){
            if (assets.onload) assets.onload();
        }
    }
};

assets.loadTextFile = function(f){
    assets.toLoad += 1;
    var reader = new FileReader();
    reader.readAsText(f);
    reader.onload = function(){
        console.log("read text done: "+ f.name);
        var json = JSON.parse(reader.result);
        assets.spritesheets.push(json);
        console.log(Object.keys(json));
        var filename = Object.keys(json)[0];
        assets.spritesheetsObj[filename] = json[filename];

        assets.loaded += 1;
        if (assets.loaded === assets.toLoad){
            if (assets.onload) assets.onload();
        }
    };
};

document.getElementById("filesin").addEventListener("change", function(e){
    var files = e.target.files;
    for (var i = 0, l = files.length; i<l ;i++){
        var f = files[i];
        if (app.string.getExt(f.name) === "json"){
            assets.loadTextFile(f);
        }
        assets.loadImageFile(f);
    }
}, false);

document.getElementById("dlImage").addEventListener("click", function(e){
    download(p.getImg().srcImage, "spritesheet.png");
}, false);

document.getElementById("dlJson").addEventListener("click", function(e){
    download(p.getJson("spritesheet.png"), "spritesheet.json");
}, false);


function download(data, filename){
    if (Blob && window.navigator.msSaveBlob){
        // IE 10+
        var blob = data instanceof HTMLCanvasElement ?
            data.msToBlob() : new Blob([data]);
        window.navigator.msSaveBlob(new Blob([blob]), filename);
    } else {
        var url = data instanceof HTMLCanvasElement ?
            data.toDataURL() : "data:text/plain;charset=utf-8," + encodeURIComponent(data);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}


function randomImgs(amount, minSize, maxSize){
    var result = [];
    var colors = ["red","orange","yellow","green","cyan","blue","violet"];
    minSize = minSize || 4;
    while (amount --> 0){
        result.push(shapes.rect(
            app.math.randChoice(colors),
            app.math.randInt(minSize, maxSize),
            app.math.randInt(minSize, maxSize),
            "black",
            1
        ))
    }
    return result;
}


var tRed8 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 8, 8, "red", 1), 3);
var tRed6 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 6, 6, "red", 1), 3);
var tGreen8 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 8, 8, "green", 1), 3);
var tGreen6 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 6, 6, "green", 1), 3);
var tGray8 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 8, 8, "gray", 1), 3);
var tGray6 = new RotatedImg(shapes.triangle("rgba(0,0,0,0)", 6, 6, "gray", 1), 3);


function createDebris(rotatedImgs, frames, rotationPerFrame, decayStart, prefix){
    var results = [];
    var r = app.math.randInt(0,360); // random start rotation;

    for (var i = 0; i<frames;i++){
        var img = rotatedImgs.getImg(r);
        if (i/frames > decayStart){
            var alpha = (1 - i/frames) / (1 - decayStart);
            img = shapes.transparent(img, alpha);
        } else {
            img = shapes.transparent(img, 1.0); // copy
        }
        img.name = prefix + i.toFixed(0) +".png";

        results.push(img);
        r += rotationPerFrame;
        if (r < 0) r += 360;
        else if (r >= 360) r -= 360;
    }
    return results;
}


var debrisImgs = [];
app.array.extend(debrisImgs,
    createDebris(tRed8, 30, -30, 0.7, "red8DebrisA"),
    createDebris(tRed8, 30, 30, 0.7, "red8DebrisB"),
    createDebris(tRed6, 30, 40, 0.5, "red6DebrisA"),
    createDebris(tRed6, 30, -40, 0.5, "red6DebrisB"),
    createDebris(tGreen8, 30, -30, 0.7, "green8DebrisA"),
    createDebris(tGreen8, 30, 30, 0.7, "green8DebrisB"),
    createDebris(tGreen6, 30, 40, 0.5, "green6DebrisA"),
    createDebris(tGreen6, 30, -40, 0.5, "green6DebrisB"),
    createDebris(tGray8, 30, 30, 0.7, "gray8DebrisA"),
    createDebris(tGray8, 30, -30, 0.7, "gray8DebrisB"),
    createDebris(tGray6, 30, 40, 0.5, "gray6DebrisA"),
    createDebris(tGray6, 30, -40, 0.5, "gray6DebrisB")
);


var p = new Packer();
p._debug = true;




assets.onload = function(){
    var imgs = [];

    var spritesheets = Object.keys(assets.spritesheetsObj);
    if (spritesheets.length > 0){
        unpackspritesheet(assets.imagesObj, assets.imagesObj, assets.spritesheetsObj);
        for (var i = 0, l = spritesheets.length; i<l; i++){
            var name = spritesheets[i];
            delete assets.imagesObj[name];
        }
    }

    var imagenames = Object.keys(assets.imagesObj);
    for (var j = 0, m = imagenames.length; j<m; j++){
        var imgname = imagenames[j];
        imgs.push(assets.imagesObj[imgname]);
    }

    p.pack(imgs);
    var pImg = p.getImg();
    canvas.width = pImg.width;
    canvas.height = pImg.height;
    p.getImg().draw(ctx, 0, 0);
};

function unpackspritesheet(results, images, spritesheet, onerror){
    if (onerror === undefined) onerror = function throwError(msg) {throw new Error(msg)};
    var names = Object.keys(spritesheet);
    console.log(names);
    for (var i = 0, l = names.length; i<l; i++){
        var name = names[i];
        var srcImage = images[name];
        if (!srcImage) onerror("parsing error: image <"+name+"> doesnt exist");

        var sheet = spritesheet[name];

        var imgnames = Object.keys(sheet);
        for (var j = 0, m = imgnames.length; j<m; j++){
            var imgname = imgnames[j];
            var d = sheet[imgname];
            var x = d.x;
            var y = d.y;
            var w = d.width;
            var h = d.height;

            if (results[imgname]) onerror("img name duplication: <"+imgname+">");
            results[imgname] = new Img(srcImage, x, y, w, h);
        }
    }

    return results;
}
