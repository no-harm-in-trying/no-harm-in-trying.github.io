var vec2 = {};

/**
 * create a new vector initialized to provided vector, otherwise 0,0
 */
vec2.create = function(from){
    var vec2 = [0,0];
    if (from){
        vec2[0] = from[0];
        vec2[1] = from[1];
    }
    return vec2;
};

/**
 * rotate a vector by radians
 */
vec2.rotate = function(out, vec2, radians){
    var sinT = Math.sin(radians);
    var cosT = Math.cos(radians);
    var x = vec2[0];
    var y = vec2[1];

    out[0] = x * cosT - y * sinT;
    out[1] = x * sinT + y * cosT;

    return out;
};

/**
 * translate a vector by another vector
 */
vec2.translate = function(out, vec2, translationVec2){
    out[0] = vec2[0] + translationVec2[0];
    out[1] = vec2[1] + translationVec2[1];
    return out;
};

/**
 * scales a vector by another vector
 */
vec2.scale = function(out, vec2, scalingVec2){
    out[0] = vec2[0] * scalingVec2[0];
    out[1] = vec2[1] * scalingVec2[1];
    return out;
};

/**
 * returns the dot product between 2 vectors
 */
vec2.dot = function(vec2A, vec2B){
    return vec2A[0] * vec2B[0] + vec2A[1] * vec2B[1];
};

/**
 * returns the cross product between 2 vectors
 */
vec2.cross = function(vec2A, vec2B){
    return vec2A[0] * vec2B * [1] - vec2A[1] * vec2B[0];
};

/**
 * set the length of vector to 1
 */
vec2.normalize = function(out, vec2){
    var x = vec2[0];
    var y = vec2[1];
    var len = x*x + y*y;
    if (len > 0){
        len = 1 / Math.sqrt(len);
        out[0] = x * len;
        out[1] = y * len;
    }
    return out;
};

/**
 * set the length of vector to maxLength if the length of vector is longer
 */
vec2.truncate = function(out, vec2, maxLength){
    var x = vec2[0];
    var y = vec2[1];
    var len = x*x + y*y;
    if (len <= maxLength*maxLength || len === 0){
        out[0] = x;
        out[1] = y;
    } else {
        len = maxLength / Math.sqrt(len);
        out[0] = x * len;
        out[1] = y * len;
    }
    return out;
};

/**
 * set the length of vector
 */
vec2.setLength = function(out, vec2, length){
    var x = vec2[0];
    var y = vec2[1];
    var len = x*x + y*y;
    if (len > 0){
        len = 1 / Math.sqrt(len);
        out[0] = x * len * length;
        out[1] = y * len * length;
    } else {
        out[0] = 0;
        out[1] = 0;
    }
};

/**
 * returns the length of the vector
 */
vec2.length = function(vec2){
    var x = vec2[0];
    var y = vec2[1];
    return Math.sqrt(x*x+y*y);
};

/**
 * returns the length squared of the vector
 */
vec2.lengthSqr = function(vec2){
    var x = vec2[0];
    var y = vec2[1];
    return (x*x+y*y);
};

/**
 * returns the angle in radians of the vector
 */
vec2.radians = function(vec2){
    var x = vec2[0];
    var y = vec2[1];
    return Math.atan2(y, x);
};

/**
 * returns the angle in degrees of the vector
 */
vec2.degrees = function(vec2){
    var x = vec2[0];
    var y = vec2[1];
    return Math.atan2(y, x) * 180/Math.PI;
};

/**
 * returns angle in radians between 2 points
 */
vec2.radiansTo = function(vec2A, vec2B){
    var dx = vec2B[0] - vec2A[0];
    var dy = vec2B[1] - vec2A[1];
    return Math.atan2(dy, dx);
};

/**
 * returns angle in degrees between 2 points
 */
vec2.degreesTo = function(vec2A, vec2B){
    var dx = vec2B[0] - vec2A[0];
    var dy = vec2B[1] - vec2A[1];
    return Math.atan2(dy, dx) * 180/Math.PI;
};

/**
 * returns distance between 2 points
 */
vec2.distTo = function(vec2A, vec2B){
    var dx = vec2B[0] - vec2A[0];
    var dy = vec2B[1] - vec2A[1];
    return Math.sqrt(dx*dx+dy*dy);
};


/**
 * returns distance squared between 2 points
 */
vec2.distSqrTo = function(vec2A, vec2B){
    var dx = vec2B[0] - vec2A[0];
    var dy = vec2B[1] - vec2A[1];
    return (dx*dx+dy*dy);
};

/**
 * returns (x,y) position specified by polar coordinates (center, length, radians)
 */
vec2.fromPolar = function(out, centerPos, length, radians){
    out[0] = length;
    out[1] = 0;
    vec2.rotate(out, out, radians);
    out[0] += centerPos[0];
    out[1] += centerPos[1];
    return out;
};

vec2.randPolarPos = function(out, centerPos, length){
    out[0] = length;
    out[1] = 0;
    vec2.rotate(out, out, app.math.randFloat(0, 2*Math.PI));
    out[0] += centerPos[0];
    out[1] += centerPos[1];
    return out;
};
