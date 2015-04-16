function Font(fontFamily, maxHeight){
    this.maxHeight = maxHeight;
    if (!this.detect(fontFamily)) throw new Error("fontFamily "+fontFamily+" not supported :(");
    if (!app.math.isPowerOf2(maxHeight) || maxHeight <= this.minHeight)
        throw new Error("maxSize must be power of 2 and greater than minSize of "+this.minHeight);
    this.glyphMipMap = this.createMipMaps(fontFamily, maxHeight, this.minHeight);
    this.cache = {};

}

Font.prototype.minHeight = 4;
Font.prototype.separator = String.fromCharCode(31);

Font.prototype.detect = function(font){
    var baseFonts = ['monospace', 'sans-serif', 'serif'];
    var testString = "mmmmmmmmmllllliiiiii";
    var size = '72px';
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var widths = [];
    var defaultFont = ctx.font;
    for (var i = 0, l = baseFonts.length; i<l; i++){
        var baseFont = baseFonts[i];
        ctx.font = size + " " + font + ", " + baseFont;
        if (ctx.font === defaultFont) return false;
        widths.push(ctx.measureText(testString).width);
    }
    return (widths[0] === widths[1] && widths[1] === widths[2]);
};

Font.prototype.createASCIIGlyphs = function(fontFamily, fontHeight){
    var result = {};
    var fontSize = Math.ceil(fontHeight/1.25);
    for (var i = 0; i < 255; i++){
        var char = String.fromCharCode(i);
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.font = ""+fontSize+"px "+fontFamily;
        canvas.width = Math.ceil(ctx.measureText(char).width);
        canvas.height = fontHeight;
        ctx.font = ""+fontSize+"px "+fontFamily;
        ctx.fillStyle = "black";
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        //ctx.strokeRect(0,0,canvas.width, canvas.height);
        ctx.fillText(char, 0,0);

        var image = new Image();
        image.src = canvas.toDataURL();
        result[char] = new Img(image, 0, 0, canvas.width, canvas.height);
    }
    return result;
};

Font.prototype.createMipMaps = function(fontFamily, maxSize, minSize){
    var result = [];
    var i = 0;
    while (maxSize >= minSize){
        result[i] = this.createASCIIGlyphs(fontFamily, maxSize);
        i++;
        maxSize /= 2;
    }
    return result;
};

Font.prototype._createTextImg = function(text, size, color){
    // first find the correct glyphs to use
    var glyphSize = this.maxHeight;
    var i = 0;
    while (size * 2 < glyphSize){
        glyphSize /= 2;
        i ++;
    }
    var glyphs = this.glyphMipMap[i];

    var ratio = size/glyphSize;
    var height = Math.ceil(glyphs["a"].height * ratio);
    var width = 0;

    // find the total width of the text
    var l = text.length;
    for (i = 0; i<l; i++){
        var glyph = glyphs[text[i]];
        width += glyph.width * ratio;
    }
    width = Math.ceil(width);

    // draw it to canvas
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.height = height;
    canvas.width = width;
    width = 0;
    for (i = 0; i<l; i++){
        glyph = glyphs[text[i]];
        ctx.drawImage(glyph.srcImage, glyph.x, glyph.y, glyph.width, glyph.height, width, 0, glyph.width*ratio, height);
        width += glyph.width * ratio;
    }

    // fill it with desired color
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color || "black";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";


    // convert to image
    var image = new Image();
    image.src = canvas.toDataURL();
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

Font.prototype.getTextImg = function(text, height, color){
    if (height < this.minHeight || height > this.maxHeight)
        throw new Error("size is out of range: "+height);
    color = color || "black";

    var key = text + this.separator + height.toFixed(0) + this.separator + color;
    if (!this.cache[key])
        this.cache[key] = this._createTextImg(text, height, color);
    return this.cache[key];
};

Font.prototype.textImgSized = function(text, width, height, color){
    if (height < this.minHeight || height > this.maxHeight)
        throw new Error("size is out of range: "+height);
    color = color || "black";

    var img = this.getTextImg(text, height, color);
    if (img.width > width){
        var scale = width/img.width;
        img = this.getTextImg(text, Math.floor(height * scale), color);
    }

    return img;
};

Font.prototype.getParaImg = function(paragraph, heightPerLine, maxWidthPerLine, color){
    color = color || "black";
    var spaceWidth = this.getTextImg(" ", heightPerLine, color).width;
    var words = paragraph.split(" ");

    // do a first pass to format the words into lines of width <= width per line;
    var lines = [];
    var usedWidth = 0;
    var line = lines[0] = [];
    for (var i = 0, l = words.length; i<l; i++){
        var w = words[i];
        var width = this.getTextImg(w, heightPerLine, color).width + spaceWidth;
        usedWidth += width;
        if (usedWidth <= maxWidthPerLine){
            line.push(w);
        } else {
            line = [w];
            lines.push(line);
            usedWidth = width;
        }
    }

    // then draw it!

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = maxWidthPerLine;
    canvas.height = lines.length * heightPerLine;
    for (i = 0, l = lines.length; i<l; i++){
        line = lines[i];
        var x = 0;
        var y = i * heightPerLine;
        for (var j = 0, k = line.length; j<k; j++){
            w = line[j];
            var img = this.getTextImg(w, heightPerLine, color);
            img.draw(ctx, x, y);
            x += (img.width + spaceWidth);
        }
    }

    var image = new Image();
    image.src = canvas.toDataURL();
    return new Img(image, 0, 0, canvas.width, canvas.height);
};

var Gui = (function(){
    var gui = {};

    gui.Root = function(ctx, font){
        this.components = [];
        this.hoverId = -1;
        this.pressId = -1;

        this.ctx = ctx;
        this.font = font;

        this.size = [ctx.canvas.width, ctx.canvas.height];

        this.absPos = [0,0];
        this.childrenIds = [];
    };

    gui.Root.prototype.drawAll = function(ctx){
        for (var i = 0, l = this.childrenIds.length; i<l; i++){
            var child = this.components[this.childrenIds[i]];
            child.drawAll(ctx);
        }
    };
    gui.Root.prototype.containsPoint = function(x, y){
        var rX = this.pos[0];
        var rY = this.pos[1];
        var rW = this.size[0];
        var rH = this.size[1];

        return app.collide.pointRect(x, y, rX, rY, rW, rH);
    };

    gui.Root.prototype.cursorMove = function(x,y){
        for (var i = 0, l = this.childrenIds.length; i<l; i++){
            var child = this.components[this.childrenIds[i]];
            if (child.cursorMove(x,y)) return true;
        }
        return false;
    };

    gui.Root.prototype.cursorDown = function(x,y){
        if (this.hoverId < 0) return false;
        var hovered = this.components[this.hoverId];
        if (!hovered) return false;
        if (this.pressId !== -1) this.cursorUp(x,y);   // in case when the up event is lost somehow

        this.pressId = hovered.id;
        if (hovered.onPress !== undefined)
            return hovered.onPress(x-hovered.absPos[0], y-hovered.absPos[1]) !== false;

        return false;
    };

    gui.Root.prototype.cursorUp = function(x,y){
        if (this.pressId < 0) return false;
        var hovered = this.components[this.pressId];
        this.pressId = -1;
        //console.log(hovered);
        if (hovered === undefined) return false;
        if (hovered.onRelease !== undefined)
            return hovered.onRelease(x-hovered.absPos[0], y-hovered.absPos[1]) !== false;
        return false;
    };

    // base class for all gui components
    function Frame(parent, pos, size, img){
        if (parent instanceof Root)
            this.root = parent;
        else
            this.root = parent.root;

        this.parent = parent;
        this.components = parent.components;
        this.childrenIds = [];
        this.id = this.components.length;
        this.components[this.id] = this;

        var x = pos[0];
        var y = pos[1];
        if (x >= 0 && x <= 1 && y >= 0 && y <= 1 && this.parent && this.parent.size){
            // x and y are between 0 to 1, taken to mean the pos is a percentage of parent size;
            var parentW = this.parent.size[0];
            var parentH = this.parent.size[1];
            pos[0] = x * parentW;
            pos[1] = y * parentH;

            var w = size[0];
            var h = size[1];
            if (w >= 0 && w <= 1 && h >= 0 && h <= 1){
                // same for size
                size[0] = w * parentW;
                size[1] = h * parentH;
            }
        }

        this.pos = pos;
        this.absPos = [this.pos[0],this.pos[1]];
        this.size = size;
        this.img = img;

        if (this !== parent){
            // move absPos to correct location;
            parent.childrenIds.push(this.id);
            this._shiftAbsPos(parent.absPos[0], parent.absPos[1]);
        }

        this.isEndNode = false; // if set to true, then mouse events would not propagate to children nodes
        this._hovering = false;
        this.visible = true
    }

    Frame.prototype.onMove = null;
    Frame.prototype.onEnter = null;
    Frame.prototype.onExit = null;
    Frame.prototype.onPress = null;
    Frame.prototype.onRelease = null;

    Frame.prototype.setPos = function(x,y,w,h){
        var dx = x - this.pos[0];
        var dy = y - this.pos[1];

        this._shiftAbsPos(dx,dy);
        if (x !== undefined) this.pos[0] = x;
        if (y !== undefined) this.pos[1] = y;
        if (w !== undefined) this.size[0] = w;
        if (h !== undefined) this.size[1] = h;
    };

    Frame.prototype._shiftAbsPos = function(dx, dy){
        this.absPos[0] += dx;
        this.absPos[1] += dy;
        if (this.isEndNode !== true){
            for (var i = 0, l = this.childrenIds.length; i<l; i++){
                var child = this.components[this.childrenIds[i]];
                child._shiftAbsPos(dx,dy);
            }
        }
    };

    Frame.prototype.containsPoint = function(x, y){
        var rX = this.pos[0];
        var rY = this.pos[1];
        var rW = this.size[0];
        var rH = this.size[1];

        return app.collide.pointRect(x, y, rX, rY, rW, rH);
    };

    Frame.prototype.cursorMove = function(x,y){
        if (!this.visible) return false;
        if (this.onMove !== null) this.onMove(x-this.absPos[0], y-this.absPos[1]);
        if (this.containsPoint(x,y)){
            // mouse is inside
            if (this._hovering === false){
                // mouse went inside from outside
                this._hovering = true;
                if (this.onEnter !== null) this.onEnter();
            }

            this.root.hoverId = this.id;

            if (this.isEndNode === false){
                x -= this.pos[0];
                y -= this.pos[1];

                for (var i = 0, l = this.childrenIds.length; i<l; i++){
                    var child = this.components[this.childrenIds[i]];
                    if (child.cursorMove(x,y)) return true;
                }
                return false;

            } else {
                return true;
            }

        } else {
            // mouse is not inside
            if (this._hovering === true){
                // went from inside to out;
                if (this.onExit !== null) this.onExit();
                if (this.root.hoverId === this.id)
                    this.root.hoverId = -1;
            }

            this._hovering = false;
            return false;
        }
    };

    Frame.prototype.cursorDown = function(x,y){
        var hovered = this.components[this.root.hoverId];
        if (!hovered) return false;

        if (this.root.pressId !== -1) this.cursorUp(x,y); // this occurs when the up event is lost somehow

        this.root.pressId = hovered.id;
        if (hovered.onPress !== null) return hovered.onPress(x-hovered.absPos[0], y-hovered.absPos[1]);
        return false;
    };

    Frame.prototype.cursorUp = function(x,y){
        var hovered = this.components[this.root.pressId];
        this.root.pressId = -1;
        if (hovered === undefined) return false;
        if (hovered.onRelease !== null) return hovered.onRelease(x-hovered.absPos[0], y-hovered.absPos[1]);
        return false;
    };

    Frame.prototype.drawSelf = function(ctx){
        if (this.img && this.visible){
            var x = this.absPos[0]; var y = this.absPos[1];
            this.img.draw(ctx, x, y);
        }
    };

    Frame.prototype.drawAll = function(ctx){
        if (this.visible === false) return;
        this.drawSelf(ctx);
        for (var i = 0, l = this.childrenIds.length; i<l; i++){
            var child = this.components[this.childrenIds[i]];
            child.drawAll(ctx);
        }
    };

    function Label(parent, pos, size, text, textColor, font){
        Frame.call(this, parent, pos, size);
        this.text = text;
        this.textColor = textColor || "black";
        this.font = font || this.root.font;

        this._ = {};
        this._.parentIsOpaque = true; // if true, then when this.img is changed, only that portion of parent needs to be redrawn;
                                      // otherwise, the entire changed region needs to be redrawn
        this._.fullyContainedByParent = true; // again, optimization that enables only the affected parent portion need to be redrawn
                                              // rather than query the entire tree.
        this._.offset = [0, 0];

        this.alignment = this.LEFT;

        this.img = this._getTextImg(text);
    }
    Label.prototype = Object.create(Frame.prototype);
    Label.prototype.LEFT = 1; // alignment enums
    Label.prototype.RIGHT = 2;
    Label.prototype.CENTER = 3;
    Label.prototype.setText = function(text){
        if (text === this.text) return;
        this.text = text;
        this._getTextImg(text);

        /*
         var ctx = this.root.ctx;
         // draw parent img
         if (this._.parentIsOpaque && this._.fullyContainedByParent && this.parent.img){
         var pImg = this.parent.img;
         var pWidth = this.parent.size[0];
         var pHeight = this.parent.size[1];
         var iWidth = pImg.width;
         var iHeight = pImg.height;
         var cx = (this.pos[0] / pWidth) * iWidth + pImg.x;
         var cy = (this.pos[1] / pHeight) * iHeight + pImg.y;
         var cw = (this.size[0] / pWidth) * iWidth;
         var ch = (this.size[1] / pHeight) * iHeight;
         ctx.drawImage(pImg.srcImage, cx, cy, cw, ch, this.absPos[0], this.absPos[1], this.size[0], this.size[1]);
         }

         this.drawSelf(ctx);*/
    };

    Label.prototype._getTextImg = function(text){
        var w = this.size[0];
        var h = this.size[1];
        var tImg = this.font.getTextImg(text, h, this.textColor);
        if (tImg.width > w){
            var scale = w/tImg.width;
            tImg = this.font.getTextImg(text, Math.floor(h * scale), this.textColor);
        }
        this.img = tImg;
        switch (this.alignment){
            case this.LEFT:
                this._.offset[0] = 0;
                break;
            case this.RIGHT:
                this._.offset[0] = w - tImg.width;
                break;
            case this.CENTER:
                this._.offset[0] = Math.floor((w - tImg.width)/2);
        }

        this._.offset[1] = Math.floor((h - tImg.height)/2);
        //console.log(h, tImg.height);
        return tImg;
    };

    Label.prototype.changeText = Label.prototype.setText;
    Label.prototype.drawSelf = function(ctx){
        // override Frame.drawSelf;
        var img = this.img;
        if (!img) return;
        var x = this.absPos[0] + this._.offset[0];
        var y = this.absPos[1] + this._.offset[1];
        img.draw(ctx, x, y);

        // debug box:
        ctx.strokeStyle = "black";
        x = this.absPos[0];
        y = this.absPos[1];
        var w = this.size[0];
        var h = this.size[1];
        ctx.strokeRect(x,y,w,h);
    };

    function Button(parent, pos, size, label, callback){
        Frame.call(this, parent, pos, size);
        this.isEndNode = true;

        this._ = {};
        this._.imgNormal = null;
        this._.imgHover = null;
        this._.imgPress = null;
        this._.imgDisable = null;
        this._.pressed = false;
        this._.disabled = false;

        this._createBtnImgsFromLabel(label);
        this.img = this._.imgNormal;
        this.callback = callback;
    }

    Button.prototype = Object.create(Frame.prototype);
    Button.prototype._createBtnImgsFromLabel = function(label){
        var _ = this._;
        _.imgNormal = this._createImg(label, "white", "silver", "black", 2);
        _.imgHover = this._createImg(label, "white", "silver", "cyan", 2);
        _.imgPress = this._createImg(label, "white", "gray", "black", 2);
        _.imgDisable = this._createImg(label, "black", "gray", "black", 2);
    };
    Button.prototype._createImg = function(label, textColor, bgColor, outlineColor, outlineWidth){
        textColor = textColor || "white";
        bgColor = bgColor || "silver";
        outlineColor = outlineColor || "black";
        outlineWidth = outlineWidth || 2;

        var roundness = 5;
        var width = this.size[0];
        var height = this.size[1];

        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;

        paths.roundRect(ctx, outlineWidth/2, outlineWidth/2, width-outlineWidth, height-outlineWidth, roundness);
        ctx.fill();
        ctx.stroke();

        var textImg = this.root.font.textImgSized(label, width, height, textColor);
        textImg.draw(ctx, (width - textImg.width)/2, (height - textImg.height)/2); // draw at middle

        var image = new Image();
        image.src = canvas.toDataURL();

        return new Img(image, 0, 0, width, height);
    };

    Button.prototype.onEnter = function(){
        if (this._.disabled) return;
        this.img = this._.imgHover;
        this._.pressed = false;
        this.drawSelf(this.root.ctx);
    };

    Button.prototype.onExit = function(){
        if (this._.disabled) return;
        this.img = this._.imgNormal;
        this._.pressed = false;
        this.drawSelf(this.root.ctx);
    };

    Button.prototype.onPress = function(){
        if (this._.disabled) return;
        this._.pressed = true;
        this.img = this._.imgPress;
        this.drawSelf(this.root.ctx);
    };

    Button.prototype.onRelease = function(){
        if (this._.disabled) return;
        this._.pressed = false;
        if (this._hovering){ // inherited property from Frame
            this.img = this._.imgHover;
            this.callback();
        } else {
            this.img = this._.imgNormal;
        }

        this.drawSelf(this.root.ctx);
    };

    Button.prototype.disable = function(){
        if (this._.pressed)  this._.pressed = false;
        this._.disabled = true;
        this.img = this._.imgDisable;
    };

    Button.prototype.enable = function(){
        this._.disabled = false;
        this.img = this._.imgNormal;
    };


    var Draggable = gui.Root.prototype.Draggable = function Draggable(parent, pos, size, imgNormal, imgHeld, clampRegion){
        Frame.call(this, parent, pos, size);
        this.isEndNode = true;
        this.imgNormal = imgNormal;
        this.imgHeld = imgHeld;
        this.img = this.imgNormal;

        this._ = {};
        this._.downPos = [0,0];
        this._.isHeld = false;
        this._.clampRegion = clampRegion;
        this._.isClamped = this._.clampRegion !== undefined;
    };

    Draggable.prototype = Object.create(Frame.prototype);
    Draggable.prototype.onMove = function(x, y){
        if (this._.isHeld){
            var downPos = this._.downPos;
            var dx = x - downPos[0];
            var dy = y - downPos[1];
            var pos = this.pos;
            var posX = pos[0] + dx;
            var posY = pos[1] + dy;

            if (this._.isClamped){
                var region = this._.clampRegion;
                var minX = region[0];
                var minY = region[1];
                var maxX = minX + region[2];
                var maxY = minY + region[3];
                posX = app.math.clamp(posX, minX, maxX);
                posY = app.math.clamp(posY, minY, maxY);
            }
            this.setPos(posX, posY);
            if (this.onDrag !== Draggable.prototype.onDrag)
                this.onDrag(posX, posY);

            this.drawSelf(ctx);
            return true;
        }
        return false;
    };

    Draggable.prototype.onPress = function(x, y){
        this._.isHeld = true;
        var downPos = this._.downPos;
        downPos[0] = x;
        downPos[1] = y;
        this.img = this.imgHeld;
        this.drawSelf(ctx);
        return true;
    };

    Draggable.prototype.onRelease = function(x, y){
        this._.isHeld = false;

        // check if moved
        var pos = this.pos;
        var downed = this._.downPos;
        if (pos[0] !== downed[0] || pos[1] !== downed[1]){
            if (this.onDrop !== Draggable.prototype.onDrop)
                this.onDrop(pos[0] + x, pos[1] + y);
        }

        this.img = this.imgNormal;
        this.drawSelf(ctx);
        return true;
    };

    Draggable.prototype.onDrag = function(x, y){
        // x, y are relative to parent frame
    };

    Draggable.prototype.onDrop = function(x, y){
        // x, y are positions relative to parent frame;
    };

    function MiniMap(parent, pos, size, viewPos, viewSize, maxSize, bgImg){
        Frame.call(this, parent, pos, size);

        this.viewPos = viewPos; // center
        this.viewSize = viewSize;
        this.maxSize = maxSize;
        this.scale = [];
        this.scale[0] = size[0] / maxSize[0];
        this.scale[1] = size[1] / maxSize[1];
        this.viewImgPos = [0,0];
        this.update();
        var viewImgWidth = Math.round(this.scale[0] * viewSize[0]);
        var viewImgHeight = Math.round(this.scale[1] * viewSize[1]);

        this.viewImg = shapes.corners("lime", viewImgWidth, viewImgHeight,5, 1);
        this.bgImg = shapes.addBorderToImg(bgImg, "silver", 2);
        this.isEndNode = true;
    }

    MiniMap.prototype = Object.create(Frame.prototype);

    MiniMap.prototype.update = function(){
        this.viewImgPos[0] = this.absPos[0] + this.scale[0] * (this.maxSize[0]/2 + this.viewPos[0] - this.viewSize[0]/2);
        this.viewImgPos[1] = this.absPos[1] + this.scale[1] * (this.maxSize[1]/2 + this.viewPos[1] - this.viewSize[1]/2);
    };
    MiniMap.prototype.drawSelf = function(ctx){
        if (this.visible){
            this.bgImg.draw(ctx, this.absPos[0], this.absPos[1]);
            this.viewImg.draw(ctx, this.viewImgPos[0], this.viewImgPos[1]);
        }
    };

    var Root = gui.Root;
    Root.prototype.Frame = Frame;
    Root.prototype.Label = Label;
    Root.prototype.Button = Button;
    Root.prototype.MiniMap = MiniMap;

    return gui;
}());
