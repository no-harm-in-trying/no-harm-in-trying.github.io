
/*
 * basically, the idea to obtain O(1) is that if the range (max - min) of keys is known
 * and the minDist between any 2 consecutive keys is known;
 * then the entire interval (min to max) can be mapped to an array and accessed via its index.
 */
function IntervalSelector(){
    this.keys = [];
    this.values = [];
    this.table = [];
    this.delta = 0;
}

IntervalSelector.prototype.addKey = function(k, v){
    // add key to list of keys via simple linear search for now
    var i,j;
    var l = this.keys.length;
    for (i = 0; i<l; i++){
        var _k = this.keys[i];
        if (k < _k) break;
        if (k === _k) throw new Error("duplicate value: "+k);
    }
    app.array.insert(this.keys, i, k);
    app.array.insert(this.values, i, v);

    if (this.keys.length >= 2){
        // construct table
        var a = this.min = this.keys[0];
        var b = this.max = this.keys[this.keys.length-1];
        var delta = this.delta = this.findMinDist();
        var range = (b-a);
        var count = Math.floor(range/delta) + 1;

        for (i = 0, j = 0; i<count; i++){
            this.table[i] = j;
            var cutoff = i*delta + a;
            if (cutoff >= this.keys[j]) j++;
        }

        //console.log(this.table);
    }
};

IntervalSelector.prototype.findMinDist = function(){
    if (this.keys.length < 2){
        return 1;
    }
    var v0 = this.keys[1];
    var min = v0 - this.keys[0];
    for (var i = 2, l = this.keys.length; i<l; i++){
        var v1 = this.keys[i];
        var _min = v1 - v0;
        if (_min < min) min = _min;
        v0 = v1;
    }
    return min;
};

// returns an index which is then then the keys can be accessed via IntervalSelector.keys[i];
// .keys[i] is the lower bound and .keys[i+1] is the upper bound;
// and same for IntervalSelector.values[i] and .values[i+1]
IntervalSelector.prototype.getIndex = function(x){
    var j = Math.floor((x-this.min)/this.delta);
    var i = this.table[j];

    if (x < this.keys[i]) i--; // this returns x as the lower bound if x equals a key; <= returns x as upper

    return i;
};


/*
 i.addKey(1.0);
 i.addKey(0.0);
 i.addKey(0.7);
 i.addKey(0.8);*/



// returns [0,1,2,2] want [0,1,1,2]

/*
 TEST CASES
 i.addKey(1.0, 1.0);
 i.addKey(-0.1, -0.1);
 i.addKey(0.3, 0.3);
 i.addKey(0.68, 0.68);
 i.addKey(0.7, 0.7);
 i.addKey(0.1, 0.1);
 i.addKey(0.4, 0.4);
 i.addKey(0.5, 0.5);

 console.log(i.keys[i.getIndex(0.2)] === 0.1);
 console.log(i.keys[i.getIndex(0.2)+1] === 0.3);
 console.log(i.keys[i.getIndex(0.25)] === 0.1);
 console.log(i.keys[i.getIndex(0.25)+1] === 0.3);
 console.log(i.keys[i.getIndex(0.35)] === 0.3);
 console.log(i.keys[i.getIndex(0.35)+1] === 0.4);
 console.log(i.keys[i.getIndex(0.45)] === 0.4);
 console.log(i.keys[i.getIndex(0.45)+1] === 0.5);
 console.log(i.keys[i.getIndex(0.51)] === 0.5);
 console.log(i.keys[i.getIndex(0.51)+1] === 0.68);
 console.log(i.keys[i.getIndex(0.98)] === 0.7);
 console.log(i.keys[i.getIndex(0.98)+1] === 1.0);
 console.log(i.keys[i.getIndex(0.07)] === -0.1);
 console.log(i.keys[i.getIndex(0.07)+1] === 0.1);
 console.log(i.keys[i.getIndex(0.999)] === 0.7);
 console.log(i.keys[i.getIndex(0.999)+1] === 1.0);
 console.log(i.keys[i.getIndex(0.69)] === 0.68);
 console.log(i.keys[i.getIndex(0.69)+1] === 0.7);

 */

function Interpolator(){
    this.intervals = new IntervalSelector();

}

Interpolator.prototype.dataPoint = function(x, y){
    this.intervals.addKey(x, y);
};

Interpolator.prototype.lerp = function(x){
    var intervals = this.intervals;
    if (x <= intervals.min) return intervals.values[0];
    else if (x >= intervals.max) return intervals.values[intervals.values.length-1];

    var i = intervals.getIndex(x);
    var x0 = intervals.keys[i];
    var x1 = intervals.keys[i+1];
    var y0 = intervals.values[i];
    var y1 = intervals.values[i+1];

    return y0 + (x-x0)/(x1-x0) * (y1-y0);
};

Interpolator.prototype.dataVec = function(x, vec){
    this.intervals.addKey(x, vec);
};

Interpolator.prototype.lerpVec = function(out, x){
    var intervals = this.intervals;

    if (x <= intervals.min)
        i = 0;
    else if (x >= intervals.max)
        i = intervals.keys.length - 2; // -1 to get last unit then -1 to get last defined interval
    else
        var i = intervals.getIndex(x);

    var x0 = intervals.keys[i];
    var x1 = intervals.keys[i+1];
    var v0 = intervals.values[i];
    var v1 = intervals.values[i+1];

    var r = (x-x0)/(x1-x0);

    for (var j = 0, l = v0.length; j<l; j++){
        out[j] = v0[j] + r * (v1[j] - v0[j]);
    }

    return out;
};
