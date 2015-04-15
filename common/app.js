"use strict";

var app = {};

app.noOp = function(){};


/**
 *
 * @param obj
 * @param {Array=} _visited
 * @param {Array=} _visitedCache
 * @returns {*}
 */
app.clone = function(obj,_visited, _visitedCache){
    if (obj === null || typeof(obj) !== "object" || obj instanceof HTMLElement){ // primitives and functions and HTML elements
        return obj;
    }
    _visited = _visited || [];
    _visitedCache = _visitedCache || [];
    var index = _visited.indexOf(obj);
    if (index===-1){ // enable cloning objects with circular references at cost of linear search;
        _visited.push(obj);
        if (Array.isArray(obj)){ // the [[Class]] of arrays can only be set by using Array constructor or [];
            var newObj = [];
            _visitedCache.push(newObj);
        } else if (obj.constructor !== undefined){
            newObj = Object.create(obj.constructor.prototype);
            _visitedCache.push(newObj);
        } else if (obj instanceof RegExp){
            newObj = new RegExp(obj);
            _visitedCache.push(newObj);
            return newObj;
        } else if (obj instanceof Date){
            newObj = new Date(obj);
            _visitedCache.push(newObj);
            return newObj;
        } else {
            throw new TypeError("How to clone object: "+obj+" is undefined.", obj);
        }
    } else { // if object already seen/ circular reference; just return reference to it

        // BUG!
        /*
         var k = {a:[]};
         k.b = k.a;
         var c = app.clone(k);

         c.a === c.b
         false
         c.a === k.a
         false
         c.a === k.b
         false
         c.b === k.a
         true
         c.b === k.b
         true

         WANT: c.a === c.b true
         c.a !== k.a and c.a !== k.b;

         FIXED: with _vistedCache; but code runs even slower I am afraid

         */
        return _visitedCache[index];
    }

    for(var key in obj) { // recursive call itself;
        if(obj.hasOwnProperty(key)) {
            newObj[key] = app.clone(obj[key], _visited, _visitedCache);
        }
    }
    return newObj;
};

app.types = {
    isObject: function(obj){
        return obj!==null && (typeof obj === "function" || typeof obj === "object");
    },
    isArray: function(obj){
        return Object.prototype.toString.call(obj) === "[object Array]"
    },
    isFunction: function(obj){
        return typeof obj === "function";
    },
    isNumber: function(obj){
        return (typeof obj === "number" && isFinite(obj));
    },
    isInt: function(obj){
        return typeof obj === "number" && isFinite(obj) && obj % 1 === 0;
    },
    isBool: function(obj){
        return typeof obj === "boolean";
    },
    isString: function(obj){
        return typeof obj === "string";
    },
    typeOf: function(obj){
        var t = typeof(obj);
        if (t === "string" || t === "boolean" || t === "undefined" || t === "function"){
            return t;
        } else if (t === "number"){
            if (isFinite(obj)){
                return "number";
            } else {
                return "infinity"; // NaN, Infinity, -Infinity
            }
        } else if (t === "object"){
            if (obj === null){
                return "null"; // typeof null is "object"
            } if (Object.prototype.toString.call(obj) === "[object Array]"){
                // can also use (obj instanceof Array); although this only checks the prototype chain
                // whereas ({}).toString returns the internal [[Class]]; this makes a difference because native
                // class types other than Object are impossible to create (ie sub classing Array);
                return "array";
            } else {
                return "object";
            }
        } else {
            throw new TypeError("cant determine type of "+obj); // dont think this will be reached
        }
    }
};


app.types.all = function(test, vars){
    if (app.types.isNumber(vars.length) && vars.length >= 0){
        var i = 0;
        var l = vars.length;
    } else {
        i = 1;
        l = arguments.length-1;
        vars = arguments;
    }
    for ( ; i<l; i++){
        var v = vars[i];
        if (test(v) === false) return false;
    }
    return true;
};

app.types.allNumbers = function(args){
    return app.types.all(app.types.isNumber, arguments);
};

app.types.assertAllNumeric = function(args){
    for (var i = 0, l = arguments.length; i<l; i++){
        var v = arguments[i];
        if (app.types.isNumber(v)===false) throw new Error("type error: "+v+" is not a number");
    }
};


app.asserts = {};

app.defClass = function(parent,classProperties,cloneParentPropertiesToChild){
    if (!app.types.isFunction(parent) || !app.types.isObject(classProperties)
        || !classProperties.constructor){
        throw new TypeError("incorrect usage of defClass; expects parent to be a function and classProperties to be an object");
    } else if (Object.prototype.toString.call(parent.prototype) !== "[object Object]"){
        throw new TypeError("defClass can not be used to extend native builtin types such as Array (not possible)");
    }
    cloneParentPropertiesToChild = cloneParentPropertiesToChild || false;

    var parentProperties = parent.prototype;

    var classConstructor = classProperties.constructor;
    var childProperties = Object.create(parentProperties);

    if (cloneParentPropertiesToChild===true){
        var keys = Object.keys(parentProperties);
        keys.forEach(function(k){
            childProperties[k] = parentProperties[k];
        });
    }

    keys = Object.keys(classProperties);
    keys.forEach(function(k){
        childProperties[k] = classProperties[k];
    });

    classConstructor.prototype = childProperties;
    return classConstructor;
};

app.loop = app.useLoop = function(stepSize){
    var loop = {
        fixStep: app.noOp, // override
        flexStep: app.noOp, // override
        fps: 30.0, // read only
        time: 0.0, // read only
        stepSize: 0.01667 // read only
    };

    // polyfill for requestAnimationFrame and cancelAnimationFrame

    /** (function() {
        var lastTime = 0;
        var vendors = ['webkit', 'moz'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame =
                window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());*/

    var _stepSize = stepSize !== undefined ? stepSize : 0.01667;
    var _at = 0.0;
    var _elapsedTime = 0.0;
    var _animFrame = -1;

    loop.start = function(stepSize){
        _stepSize = stepSize || 0.01667;
        loop.stepsize = _stepSize;
        if (!app.types.isNumber(_stepSize) || stepSize <= 0){
            throw new TypeError("Cant start loop, stepSize is invalid: "+_stepSize);
        }
        loop.start = app.noOp;
        mainLoop(_elapsedTime);
    };

    loop.pause = function(){
        cancelAnimationFrame(_animFrame);
    };

    var mainLoop = function(newTime){
        newTime /= 1000;
        var tick = newTime - _elapsedTime;
        loop.fps = (1/tick);
        _elapsedTime = newTime;
        loop.time = _elapsedTime;
        tick = tick > 0.25 ? 0.25 : tick; // limit

        _at += tick;
        //while (_at > _stepSize){
        //    _at -= _stepSize;
        //   loop.fixStep(_stepSize);
        //}

        loop.flexStep(tick);

        _animFrame = requestAnimationFrame(mainLoop);
    };

    return loop;
};

app.useKeyboard = function(canvas){
    var kb = {
        onKeyDown: [],
        onKeyUp: [],
        keyDown: [],
        preventDefaultBehaviours: true,

        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,

        0: 48,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,

        ENTER: 13,
        SPACE: 32,
        TAB: 9,
        ESC: 27,
        BACKSPACE: 8,

        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,

        SHIFT: 16,
        CONTROL: 17,
        ALT: 18,
        CAPSLOCK: 20,
        NUMSLOCK: 144,

        INSERT: 45,
        DELETE: 46,
        HOME: 36,
        END: 35,
        PAGEUP: 33,
        PAGEDOWN: 34,

        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123
    };


    canvas.tabIndex = 1;// this allows the canvas to listen to keyboard keyevents

    canvas.addEventListener("keydown", function(event){
        var callbacks = kb.onKeyDown;
        if (callbacks[event.keyCode]!==undefined){
            callbacks[event.keyCode]();
        }
        if (kb.preventDefaultBehaviours === true){
            event.preventDefault();
        }
        kb.keyDown[event.keyCode] = true;

    },false);

    canvas.addEventListener("keyup", function(event){
        var callbacks = kb.onKeyUp;
        if (callbacks[event.keyCode]!==undefined){
            callbacks[event.keyCode]();
        }
        if (kb.preventDefaultBehaviours === true){
            event.preventDefault();
        }
        kb.keyDown[event.keyCode] = false;

    },false);

    return kb;
};

app.useCursor = function(canvas){
    if (!canvas instanceof HTMLElement)
        throw new Error("useCursor must bind to a valid HTMLElement");
    var cursor = {
        x: 0, y: 0,
        isPressed: false,
        isDoubleClick: false,
        lastX: 0, lastY: 0, lastT: 0,
        clickX: 0, clickY: 0, clickT: 0,
        dx: 0, dy: 0, duration: 0,
        button: 0,
        wheelDelta: 0,

        onDown: function(){},
        onMove: function(){},
        onUp: function(){},
        onWheel: function(){},
        onLeave: function(){},

        LEFT: 1,
        WHEEL: 2,
        RIGHT: 3
    };

    function bindListeners (elem,events,callback){
        events = events.split(" ");
        var i = events.length;
        while(i--){
            elem.addEventListener(events[i],callback,false);
        }
    }

    function getTouchEvent(event){
        if (event.targetTouches !== undefined){
            return event.targetTouches[0];
        } else {
            return event;
        }
    }

    // disable right click menu and click events; use onDown and onUp instead;
    bindListeners(canvas, "contextmenu click", function(e){
        e.preventDefault();
    });

    bindListeners(canvas, "mouseleave mouseout", function(e){
        e.preventDefault();
        cursor.onLeave();
    });

    bindListeners(canvas,"touchstart mousedown", function(e){
        e.preventDefault();
        var p = getTouchEvent(e);
        var rect = canvas.getBoundingClientRect();
        cursor.x = cursor.lastX = p.clientX - rect.left;
        cursor.y = cursor.lastY = p.clientY - rect.top;
        cursor.button = e.which;
        cursor.isPressed = true;
        cursor.dx = 0;
        cursor.dy = 0;
        cursor.duration = e.timeStamp - cursor.clickT;
        cursor.isDoubleClick = (cursor.duration <= 300 && cursor.isDoubleClick === false);
        cursor.lastT = e.timeStamp;
        cursor.clickT = e.timeStamp;
        cursor.clickX = cursor.x;
        cursor.clickY = cursor.y;

        cursor.onDown();
    });

    bindListeners(canvas,"touchend mouseup touchcancel", function(e){
        e.preventDefault();
        cursor.isPressed = false;
        cursor.onUp();
    });

    bindListeners(canvas,"touchmove mousemove", function(e){
        e.preventDefault();
        var p = getTouchEvent(e);
        var rect = canvas.getBoundingClientRect();
        cursor.x = p.clientX - rect.left;
        cursor.y = p.clientY - rect.top;
        if (cursor.isPressed){
            cursor.dx = cursor.x - cursor.lastX;
            cursor.dy = cursor.y - cursor.lastY;
            cursor.duration = e.timeStamp - cursor.lastT;
            cursor.lastX = cursor.x;
            cursor.lastY = cursor.y;
            cursor.lastT = e.timeStamp;
        }

        cursor.onMove();
    });

    bindListeners(canvas,"DOMMouseScroll mousewheel", function(e){
        e.preventDefault();
        cursor.wheelDelta = e.detail ? e.detail * -120 : e.wheelDelta;
        cursor.onWheel();
    });

    return cursor;
};

app.math = function(){
    var math = {};
    // inclusive a,b
    math.randInt = function(a,b){
        return Math.floor(a+Math.random()*(b-a+1));
    };
    // excludes b
    math.randFloat = function(a,b){
        return (a+Math.random()*(b-a));
    };
    math.randChoice = function(array){
        return array[math.randInt(0,array.length-1)];
    };

    math.clamp = function(value, min, max){
        return Math.min(Math.max(value,min),max);
    };

    math.clampComparison = function(value,min,max){
        if (value < min){
            return min;
        } else if (value > max){
            return max;
        } else {
            return value;
        }
    };

    math.mod = function(a,b){
        // % is remainder function; remainder and mod have different behaviour when dividend is negative
        return ((a % b)+ b ) % b;
    };

    math.lerp = function(v1, v2, r){
        return (v1 + (v2 - v1) * r);
    };

    math.sign = function(v){
        if (v > 0) return 1;
        else if (v < 0) return -1;
        else return 0;
    };

    math.toRadians = function(degrees){
        return degrees * (Math.PI/180);
    };

    math.toDegrees = function(radians){
        return radians * (180/Math.PI);
    };

    math.angleDifference = function(radians1, radians2){
        var dif = radians2 - radians1;
        return app.math.mod((dif + Math.PI), 2*Math.PI) - Math.PI;
    };

    math.angleDiffDegrees = function(angle1,angle2){
        var dif = angle2 - angle1;
        return app.math.mod((dif + 180), 360) - 180;
    };

    math.isPowerOf2 = function(num){
        if (num === 0) return false;
        var r = num & (num-1);
        return r === 0;
    };

    /**
     * b must be power of 2;
     */
    math.fastModPowOf2 = function(a, b){
        return a & (b - 1);
    };

    return math;
}();

app.array = {};
app.array.recycled = [];
app.array.create = function(){
    var recycled = this.recycled;
    return recycled.length > 0 ? this.recycled.pop() : [];
};

app.array.newArray = function(){
    var recycled = this.recycled;
    return recycled.length > 0 ? this.recycled.pop() : [];
};
app.array.free = function(arr){
    arr.length = 0;
    this.recycled.push(arr);
};

app.array.init = function(arr, length, value){
    for (var i = 0; i<length; i++){
        arr[i] = value;
    }
    arr.length = length;
    return arr;
};

// filters in place
app.array.filter = function(arr, filter){
    var numOfFiltered = 0;
    for (var i = 0, l = arr.length; i<l;i++){
        var e = arr[i];
        if (filter(e, i, arr)){
            arr[numOfFiltered++] = e;
        }
    }
    arr.length = numOfFiltered;
};

app.array.swapDelete = function(arr, index){
    arr[index] = arr[arr.length-1];
    arr.length -= 1; // implicitly deleting last elem
    return arr;
};

app.array.swapDeleteElem = function(arr, elem){
    var i = app.array.indexOf(arr, elem);
    if (i >= 0) return app.array.swapDelete(arr, i);
    else return arr;
};

app.array.swapRemove = function(arr, elem){
    var i = app.array.indexOf(arr, elem);
    if (i >= 0) return app.array.swapDelete(arr, i);
    else return arr;
};

app.array.swap = function(arr, i, j){
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
    return arr;
};

app.array.extend = function(arr, elems){
    if (arguments.length >= 3){
        for (var i = 1, l = arguments.length; i<l; i++){
            arr.push.apply(arr, arguments[i]);
        }
    } else {
        arr.push.apply(arr, elems);
    }

    return arr;
};

/**
 * insert elem at arr[index] - warning: O(n)
 */
app.array.insert = function(arr, index, elem){
    arr.splice(index, 0, elem);
};

/**
 * removes elem at index - warning: O(n)
 */
app.array.remove = function(arr, index){
    var elem = arr[index];
    arr.splice(index, 1);
    return elem;
};

/**
 * removes the first elem found in array if elem exists - warning: O(n);
 */
app.array.removeElem = function(arr, elem){
    var index = app.array.indexOf(arr, elem);
    if (index >= 0) {
        app.array.remove(arr, index);
        return true;
    } else {
        return false;
    }
};

app.array.flatten = function(arr){
    return Array.prototype.concat.apply([],arr);
};

app.array.shuffle = function(arr){
    var m = arr.length, t, i;
    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
    }

    return arr;
};


app.array.find = function(arr, criteria){
    for (var i = 0, l = arr.length; i<l; i++){
        var elem = arr[i];
        if (criteria(elem)) return elem;
    }
    return undefined;
};

app.array.insert = function(arr, index, elem){
    arr.splice(index,0,elem);
};

app.array.new2dArray = function(x, y, initV){
    var array = [];
    for (var i = 0; i<x; i++){
        var row = [];
        for (var j = 0; j<y; j++){
            row.push(initV);
        }
        array.push(row);
    }

    return array;
};

app.array.pushIfTrue = function(arr, elem){
    if (elem) arr.push(elem);
};

app.array.indexOf = function(arr, elem){
    for (var i = 0, l = arr.length; i<l; i++){
        if (arr[i] === elem) return i;
    }
    return -1;
};


app.array.contains = function(arr, elem){
    for (var i = 0, l = arr.length; i<l; i++){
        if (arr[i]===elem) return true;
    }
    return false;
};

// requires elements in array to have unique immutable toString id if array is large
app.array.union = function(arr1, arr2){
    if (arr2.length > arr1.length){
        var smaller = arr1;
        var larger = arr2;
    } else {
        smaller = arr2;
        larger = arr1;
    }
    var result = [];

    if (larger.length * smaller.length < 255){
        for (var i = 0, l = smaller.length; i<l; i++){
            var elem = smaller[i];
            if (app.array.indexOf(larger, elem) !== -1){
                result.push(elem);
                break;
            }
        }
    } else {
        // convert larger array to hash first
        var hash = app.array.toHash(larger);
        for (i = 0, l = smaller.length; i<l; i++){
            elem = smaller[i];
            if (hash[elem]) result.push(elem);
        }
    }
    return result;
};

/**
 * every element in the arr must have an unique toString() representation as JS only hash by string
 */
app.array.toHash = function(arr){
    var hash = {};
    for (var i = 0, l = arr.length; i<l; i++){
        var elem = arr[i];
        hash[elem] = true;
    }

    if (hash["[object Object]"]) throw new Error("can not hash js objects without unique toString: "+hash);
    return hash;
};


app.array.range = function(start, stop, step){
    switch (arguments.length){
        case 1:
            stop = start;
            start = 0;
            step = 1;
            break;
        case 2:
            step = 1;
            break;
        case 3:
            if (app.math.sign(step) !== app.math.sign(stop - start)) return [];
            break;
        default:
            throw new Error("incorrect number of arguments");
    }

    var result = [];
    //console.log(start,stop,step);
    if (step > 0){
        for (var i = start; i < stop; i+=step){
            result.push(i);
        }
    } else {
        for (i = start; i > stop; i+=step){
            result.push(i);
        }
    }
    return result;
};

app.array.fromSet = function(set){
    return Object.keys(set).filter(function(e){return set[e]});
};

app.collide = {};
app.collide.getDist = function(x1,x2,a1,a2){
    return Math.max(x1,a1) - Math.min(x2,a2);
};


app.collide.boxBox = function boxBoxCheck(ax,ay,az,aw,ah,ad,bx,by,bz,bw,bh,bd){
    return !(
        ((ax + aw) < bx) || (ax > (bx + bw))
            || ((ay + ah) < by) || (ay > (by + bh))
            || ((az + ad) < bz) || (az > (bz + bd))
        )
};

app.collide.overlapNoBorder = function(aStart, aEnd, bStart, bEnd){
    return aEnd > bStart && bEnd > aStart;
};

app.collide.overlap = function(aStart, aEnd, bStart, bEnd){
    return aEnd >= bStart && bEnd >= aStart;
};

app.collide.pointRect = function(x,y,rX,rY,rW,rH){
    return (x >= rX && x <= rX + rW && y >= rY && y <= rY + rH);
};

app.collide.pointCircle = function(x,y,cX,cY,cR){
    var dx = x - cX;
    var dy = y - cY;
    return (dx*dx + dy*dy) <= (cR * cR);
};

app.collide.rectRect = function(ax,ay,aw,ah,bx,by,bw,bh){
    return !(
        ((ay+ah) < by) || (ay > (by +bh)) || ((ax + aw) < bx) || (ax > (bx +bw))
        )
};


// intersection tests; all function expects the first argument to be an array which the
// intersecting point data will be returned
app.intersect = {};

app.intersect.lineRect = function(out, x, y, x1, y1, rectX, rectY, rectHW, rectHH){
    var dx = x1 - x;
    var dy = y1 - y;

    var m = dy/dx;
    var rm = rectHH/ rectHW;

    if (Math.abs(m) <= rm){
        // x is the limiting side
        if (dx > 0)
            var toEdge = rectX + rectHW - x;
        else
            toEdge = rectX - rectHW - x;

        dy *= toEdge/dx;
        out[0] = x + toEdge;
        out[1] = y + dy;
        return out;

    } else {
        // y is the limiting side
        if (dy > 0)
            toEdge = rectY + rectHH - y;
        else
            toEdge = rectY - rectHH - y;

        dx *= toEdge/dy;
        out[0] = x + dx;
        out[1] = y + toEdge;
        return out;
    }
};






app.collection = app.collections = {};

/**
 * Enum; kinda not very useful because the arguments must be in strings/int;
 * and thus there is no IDE help with verification
 * @returns {{}}
 * @constructor
 */
app.collection.Enum = function(){
    var obj = {};
    for (var i = 0, l = arguments.length; i<l; i++){
        obj[arguments[i]] = i+1; // shifted by 1 to avoid implicit comparison issue
    }
    Object.freeze(obj);
    return obj;
};

app.collection.Counter = function Counter(){
    this.x = 0;
};
app.collection.Counter.prototype.next = function(){
    return this.x++;
};


/**
 * Implmements a queue using two stacks; much more performant compared to push/shift or unshift/pop:
 * http://jsperf.com/queue-push-unshift-vs-shift-pop/16
 * only supports enque and deque with a read only length;
 * @constructor
 */
app.collection.Queue = function Queue(){
    this.tempStack = [];
    this.stack = [];
    this.length = 0;
};

app.collection.Queue.prototype = {
    constructor: app.collection.Queue,
    enque: function(elem){
        this.tempStack.push(elem);
        this.length += 1;
    },
    deque: function(){
        if (this.stack.length === 0){
            while (this.tempStack.length > 0){
                this.stack.push(this.tempStack.pop());
            }
        }
        this.length -= 1;
        return this.stack.pop();
    }
};


/**
 * Implements a timer accepts callbacks with a waiting time. Requires a Queue structure.
 * @constructor
 */
app.collection.Timer = function Timer(){
    this.processes = new this.Queue();
    this.wait = -1;
};

app.collection.Timer.prototype = {
    Queue: app.collection.Queue,

    constructor: app.collection.Timer,
    push: function(callback, wait){
        if (this.processes.length === 0){
            this.wait = 0;
        }

        this.processes.enque({
            callback: callback,
            wait: wait
        });
    },
    update: function(dt){
        if (this.wait >= 0){
            this.wait -= dt;
            while (this.wait < 0 && this.processes.length > 0){
                var p = this.processes.deque();
                p.callback();
                this.wait += p.wait;
            }
        }

    }
};

/**
 * double/bi-directional linked list
 *
 * sample usage:
 * var l = new LinkedList();
 * l.[push|enque](data)...
 * l.[pop|deque]() -> data
 *
 * contains its own iterator (l.cur - current node) so it can be traversed it like so:
 *
 *     l.reset(); // or l.cur = l.head;
 *     while (l.nextIsValid()){ // or l.cur.next !== l.head
 *         do_something(l.next());
 *         or do_something_to_node(l.cur) and l.cur = l.cur.next;
 *     }
 * @constructor
 */
app.collection.LinkedList = function(){
    this.head = this.newNode(this.END);
    this.head.prev = this.head;
    this.head.next = this.head;

    this.length = 0;
    this.cur = this.head;
};

app.collection.LinkedList.prototype = {
    constructor: app.collection.LinkedList,
    recycledNodes: [],

    END: new function HEADMARKER(){}, // JUST A NULL DATA OBJECT MARKER

    Node: function(data){
        this.stuff = data;
        this.prev = null;
        this.next = null;
    },
    newNode: function(data){
        if (this.recycledNodes.length > 0){
            var node = this.recycledNodes.pop();
            node.prev = null;
            node.next = null;
            node.stuff = data;
            return node;
        } else {
            return new this.Node(data);
        }
    },
    insertAfter: function(node, data){
        var newNode = this.newNode(data);
        newNode.next = node.next;
        node.next.prev = newNode;
        newNode.prev = node;
        node.next = newNode;
        this.length += 1;
        return newNode;
    },
    insertBefore: function(node, data){
        var newNode = this.newNode(data);
        newNode.prev = node.prev;
        node.prev.next = newNode;
        newNode.next = node;
        node.prev = newNode;
        this.length += 1;
        return newNode;
    },
    removeNode: function(node){
        node.prev.next = node.next;
        node.next.prev = node.prev;
        this.recycledNodes.push(node);
        var data = node.stuff;
        node.stuff = undefined;
        this.length -= 1;
        return data;
    },

    first: function(){
        if (this.head.next === this.head) return undefined; // empty
        return this.head.next.stuff;
    },

    last: function(){
        if (this.head.prev === this.head) return undefined; // empty
        return this.head.prev.stuff;
    },

    toArray: function(){
        var result = [];
        var node = this.head.next;
        while (node !== this.head){
            result.push(node.stuff);
            node = node.next;
        }
        return result;
    },
    next: function(){
        this.cur = this.cur.next;
        return this.cur.stuff;
    },
    prev: function(){
        this.cur = this.cur.prev;
        return this.cur.stuff;
    },
    nextIsValid: function(){
        return this.cur.next !== this.head;
    },
    prevIsValid: function(){
        return this.cur.prev !== this.head;
    },
    reset: function(){
        this.cur = this.head;
    },
    remove: function(){
        if (this.cur === this.head) return;
        this.removeNode(this.cur);
    },

    getNodeAt: function(index){
        if (index < this.length && index >= 0){
            var n = this.head.next;
            while (index --> 0){
                n = n.next;
            }
            return n;
        }

        return undefined;
    },

    removeNodeAt: function(index){
        if (index < this.length && index >= 0){
            var n = this.head.next;
            while (index --> 0){
                n = n.next;
            }
            return this.removeNode(n);
        }

        return undefined;
    }

};

app.collection.LinkedList.prototype.push = function(data){
    this.insertBefore(this.head, data);
};
app.collection.LinkedList.prototype.pop = function(){
    if (this.head.prev === this.head) return undefined; // empty
    else return this.removeNode(this.head.prev);
};
app.collection.LinkedList.prototype.enque = function(data){
    this.insertAfter(this.head, data);
};
app.collection.LinkedList.prototype.deque = function(){
    if (this.head.next === this.head) return undefined; // empty
    else return this.removeNode(this.head.next);
};

/**
 * @constructor
 */
app.collection.BinaryHeap = function(){
    this.elements = [];
    this.priorities = [];
    this.length = 0;
};

app.collection.BinaryHeap.prototype = {
    constructor: app.collection.BinaryHeap,

    swap: function(n,n1){
        var e = this.elements[n1];
        var p = this.priorities[n1];
        this.elements[n1] = this.elements[n];
        this.priorities[n1] = this.priorities[n];
        this.elements[n] = e;
        this.priorities[n] = p;
    },
    put: function(element,priority){
        this.elements.push(element);
        this.priorities.push(priority);
        this.bubble(this.elements.length-1);
        this.length += 1;
        return element;
    },
    get: function(){
        var result = this.elements[0];
        var end = this.elements.pop();
        var priority = this.priorities.pop();
        if (this.elements.length > 0){
            this.elements[0] = end;
            this.priorities[0] = priority;
            this.sink(0);
        }
        this.length -= 1;
        return result;
    },
    bubble: function(n){
        var priority = this.priorities[n];
        while (n > 0){
            var parentN = Math.floor((n+1)/2)-1;
            var parentPriority = this.priorities[parentN];
            if (priority >= parentPriority){
                break;
            }
            this.swap(n,parentN);
            n = parentN;
        }
    },
    sink: function(n){
        var length = this.elements.length;
        var priority = this.priorities[n];

        while (true){
            var child1N = (n+1) * 2;
            var child2N = child1N - 1;

            var swap = null;
            if (child1N < length){
                var child1P = this.priorities[child1N];
                if (child1P < priority){
                    swap = child1N;
                }
            }

            if (child2N < length){
                var child2P = this.priorities[child2N];
                if (child2P < (swap === null ? priority : child1P)){
                    swap = child2N;
                }
            }

            if (swap === null){
                break;
            }

            this.swap(swap,n);
            n = swap;
        }
    },
    empty: function(){
        this.length = 0;
        this.elements.length = 0;
        this.priorities.length = 0;
        return this;
    }
};



app.assets = {
    toLoad: 0,
    loaded: 0,
    path: "",

    onload: function(){} // override
};

app.assets.loadImages = function(files, callback){
    var result = {};
    var assets = app.assets;
    files.forEach(function(name){
        var src = app.assets.path+name;
        var img = new Image();
        img.src = src;
        assets.toLoad += 1;
        result[name] = img;
        img.onload = function(){
            assets.loaded += 1;
            if (assets.loaded === assets.toLoad) assets.onload();
            if (callback) callback();
        };
        img.onerror = function(){
            throw new Error("loading image file at "+assets.path+name+" failed");
        }
    });
    return result;
};

app.assets.loadAudios = function(files){
    var result = {};
    var assets = app.assets;
    var supportedFormats = {};
    var a = document.createElement("audio");
    supportedFormats["mpeg"] = !!(a.canPlayType('audio/mpeg;').replace(/no/, ''));
    supportedFormats["mp3"] = !!(a.canPlayType('audio/mp3;').replace(/no/, ''));
    supportedFormats["ogg"] = !!(a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
    supportedFormats["wav"] = !!(a.canPlayType('audio/wav; codecs="1"').replace(/no/, ''));
    supportedFormats["mp4"] = !!(a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''));

    files.forEach(function(name){
        var ext = app.string.getExt(name);
        if (!supportedFormats[ext]){
            var canPlay = !!(a.canPlayType('audio/'+ext).replace(/no/, ''));
            if (canPlay === false) throw new Error("Audio file "+name+"'s format is not supported");
            supportedFormats[ext] = canPlay;
        }

        var src = app.assets.path+name;
        var audio = Audio !== undefined ? new Audio() : document.createElement("audio");
        audio.src = src;
        audio.autoplay = false;
        assets.toLoad += 1;
        result[name] = audio;
        audio.oncanplay = function(){
            assets.loaded += 1;
            if (assets.loaded === assets.toLoad) assets.onload();
        };
        audio.onerror = function(){
            throw new Error("loading audio file at "+assets.path+name+" failed");
        }
    });
    return result;
};

app.assets.loadJSONs = function(files, callback){
    var result = {};
    var assets = app.assets;

    files.forEach(function(filename){
        var req = new XMLHttpRequest();
        assets.toLoad += 1;
        req.open("GET", assets.path+filename);
        req.setRequestHeader("Content-type", "application/json");
        req.onreadystatechange = function(){
            if (req.readyState === 4){
                if (req.status === 200){
                    result[filename] = JSON.parse(req.responseText);
                    assets.loaded += 1;
                    if (callback) callback();
                    if (assets.loaded === assets.toLoad) assets.onload();
                } else {
                    throw new Error("loading JSON file "+filename+" failed");
                }
            }
        };
        req.send();
    });
    return result;
};

app.string = {};
app.string.removeExt = function(filename){
    return filename.replace(/\..*$/,""); // removes everything after first . and to the end;
};

app.string.getExt = function(filename){
    var r = filename.match(/\.(.*$)/);
    return r ? r[1] : null;
};

app.utils = {};
app.utils.createCanvas = function(width, height){
    if (!width > 0 && !height > 0) throw new Error("typeError: create canvas width and height: "+width+", "+height);
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext("2d");
};

app.utils.memoized = function(fn, thisObj, argDelimiter){
    var cache = {};
    var separator = argDelimiter || String.fromCharCode(31);
    var _fn = function memoed(args){
        var key = Array.prototype.join.call(arguments, separator);
        if (cache[key]) return cache[key];
        else {
            var result = fn.apply(arguments);
            cache[key] = result;
            return result;
        }
    };
    if (thisObj) _fn.bind(thisObj);
    _fn.cache = cache; // for debugging
    return _fn;
};

app.utils.assert = function(expression, errMsg){
    if (!expression) throw new Error(errMsg || "assert failed");
};

app.utils.timeIt = (function(){
    // polyfill
    if (!Date.now) {
        Date.now = function now() {
            return new Date().getTime();
        };
    }
    var _time = Date.now();
    function timeIt(){
        var now = Date.now();
        var dt = Date.now() - _time;
        _time = now;
        return dt;
    }
    return timeIt;
}());


app.objects = {};
app.objects.shallowClone = function(obj){
    var newObj = obj.constructor.prototype ? Object.create(obj.constructor.prototype) : {};
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i<l; i++){
        var k = keys[i];
        newObj[k] = obj[k];
    }
    return newObj;
};

app.objects.extend = function(obj, extensions){
    var keys = Object.keys(extensions);
    for (var i = 0, l = keys.length; i<l; i++){
        var k = keys[i];
        obj[k] = extensions[k];
    }
    return obj;
};

app.objects.inherited = function(prototype, newProperties){
    var newPrototype = Object.create(prototype);
    var keys = Object.keys(newProperties);
    for (var i = 0, l = keys.length; i<l; i++){
        var k = newProperties[i];
        newPrototype[k] = newProperties[k];
    }
    return newPrototype;
};


app.function = {};
app.function.memoized = function(fn, thisObj, argDelimiter){
    var cache = {};
    var separator = argDelimiter || String.fromCharCode(31);

    var _fn = function memoed(args){
        var key = Array.prototype.join.call(arguments, separator);
        if (cache[key]) return cache[key];
        else {
            var result = fn.apply(thisObj, arguments);
            cache[key] = result;
            return result;
        }
    };
    _fn.cache = cache; // for debugging
    return _fn;
};

app.function.timeIt = function(fn, thisObj){
    var now = window.performance.now ? window.performance.now.bind(window.performance) : Date.now.bind(Date);
    return function timed(args){
        var start = now();
        var r = fn.apply(thisObj, arguments);
        console.log(now()-start);
        return r;
    }
};
