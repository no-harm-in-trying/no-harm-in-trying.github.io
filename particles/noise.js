function Perlin(){
    //http://staffwww.itn.liu.se/~stegu/aqsis/aqsis-newnoise/noise1234.cpp
    // just list of random values from 0 to 255
    var perm = [151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
        151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];

    if (Uint8ClampedArray) perm = new Uint8ClampedArray(perm);

    //app.array.shuffle(perm);

    var floor = Math.floor;
    var fade = function(t){return t * t * t * ( t * ( t * 6 - 15 ) + 10 )};
    var mix = function(a,b,t){return (1-t)*a + t*b;};

    var grad1 = function(hash, x){
        var h = hash & 15;
        var grad = 1.0 + (h & 7);  // Gradient value 1.0, 2.0, ..., 8.0
        if (h>4) grad = -grad;         // and a random sign for the gradient
        return ( grad * x );           // Multiply the gradient with the distance
    };

    var grad2 = function(hash, x, y){
        var h = hash & 7;
        var u = h<4 ? x : y;  // into 8 simple gradient directions,
        var v = h<4 ? y : x;  // and compute the dot product with (x,y).
        return ((h&1)? -u : u) + ((h&2)? -2.0*v : 2.0*v);
    };

    var grad3 = function(hash, x, y, z){
        var h = hash & 15;     // Convert low 4 bits of hash code into 12 simple
        var u = h<8 ? x : y; // gradient directions, and compute dot product.
        var v = h<4 ? y : h==12||h==14 ? x : z; // Fix repeats at h = 12 to 15
        return ((h&1)? -u : u) + ((h&2)? -v : v);
    };

    var grad4 = function(hash, x, y, z, w){
        var h = hash & 31;      // Convert low 5 bits of hash code into 32 simple
        var u = h<24 ? x : y; // gradient directions, and compute dot product.
        var v = h<16 ? y : z;
        var r = h<8 ? z : w;
        return ((h&1)? -u : u) + ((h&2)? -v : v) + ((h&4)? -r : r);
    };

    var pkg = {};


    pkg.periodic1 = function(x, px){
        var ix0, ix1; // ints
        var fx0, fx1; // floats
        var s, n0, n1; // floats

        ix0 = floor( x ); // Integer part of x
        fx0 = x - ix0;       // Fractional part of x
        fx1 = fx0 - 1.0;
        ix1 = (( ix0 + 1 ) % px) & 0xff; // Wrap to 0..px-1 *and* wrap to 0..255
        ix0 = ( ix0 % px ) & 0xff;      // (because px might be greater than 256)

        s = fade( fx0 );

        n0 = grad1( perm[ ix0 ], fx0 );
        n1 = grad1( perm[ ix1 ], fx1 );
        return 0.188 * ( mix( n0, n1, s ) );
    };

    /**
     * 2D periodic perlin noise
     */
    pkg.periodic2 = function(x, y, px, py){
        var ix0, iy0, ix1, iy1; //int
        var fx0, fy0, fx1, fy1; // float
        var s, t, nx0, nx1, n0, n1; // float

        ix0 = floor( x ); // Integer part of x
        iy0 = floor( y ); // Integer part of y
        fx0 = x - ix0;        // Fractional part of x
        fy0 = y - iy0;        // Fractional part of y
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        ix1 = (( ix0 + 1 ) % px) & 0xff;  // Wrap to 0..px-1 and wrap to 0..255
        iy1 = (( iy0 + 1 ) % py) & 0xff;
        ix0 = ( ix0 % px ) & 0xff;
        iy0 = ( iy0 % py ) & 0xff;

        t = fade( fy0 );
        s = fade( fx0 );

        nx0 = grad2(perm[ix0 + perm[iy0]], fx0, fy0);
        nx1 = grad2(perm[ix0 + perm[iy1]], fx0, fy1);
        n0 = mix(nx0, nx1, t );

        nx0 = grad2(perm[ix1 + perm[iy0]], fx1, fy0);
        nx1 = grad2(perm[ix1 + perm[iy1]], fx1, fy1);
        n1 = mix(nx0, nx1, t);

        return 0.507 * mix(n0, n1, s);
    };

    pkg.periodic3 = function(x, y, z, px, py, pz){
        var ix0, iy0, ix1, iy1, iz0, iz1; // ints
        var fx0, fy0, fz0, fx1, fy1, fz1; // floats
        var s, t, r; // floats
        var nxy0, nxy1, nx0, nx1, n0, n1; // floats

        ix0 = floor( x ); // Integer part of x
        iy0 = floor( y ); // Integer part of y
        iz0 = floor( z ); // Integer part of z
        fx0 = x - ix0;        // Fractional part of x
        fy0 = y - iy0;        // Fractional part of y
        fz0 = z - iz0;        // Fractional part of z
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        fz1 = fz0 - 1.0;
        ix1 = (( ix0 + 1 ) % px ) & 0xff; // Wrap to 0..px-1 and wrap to 0..255
        iy1 = (( iy0 + 1 ) % py ) & 0xff; // Wrap to 0..py-1 and wrap to 0..255
        iz1 = (( iz0 + 1 ) % pz ) & 0xff; // Wrap to 0..pz-1 and wrap to 0..255
        ix0 = ( ix0 % px ) & 0xff;
        iy0 = ( iy0 % py ) & 0xff;
        iz0 = ( iz0 % pz ) & 0xff;

        r = fade( fz0 );
        t = fade( fy0 );
        s = fade( fx0 );

        nxy0 = grad3(perm[ix0 + perm[iy0 + perm[iz0]]], fx0, fy0, fz0);
        nxy1 = grad3(perm[ix0 + perm[iy0 + perm[iz1]]], fx0, fy0, fz1);
        nx0 = mix( nxy0, nxy1, r );

        nxy0 = grad3(perm[ix0 + perm[iy1 + perm[iz0]]], fx0, fy1, fz0);
        nxy1 = grad3(perm[ix0 + perm[iy1 + perm[iz1]]], fx0, fy1, fz1);
        nx1 = mix( nxy0, nxy1, r );

        n0 = mix( nx0, nx1, t );

        nxy0 = grad3(perm[ix1 + perm[iy0 + perm[iz0]]], fx1, fy0, fz0);
        nxy1 = grad3(perm[ix1 + perm[iy0 + perm[iz1]]], fx1, fy0, fz1);
        nx0 = mix( nxy0, nxy1, r );

        nxy0 = grad3(perm[ix1 + perm[iy1 + perm[iz0]]], fx1, fy1, fz0);
        nxy1 = grad3(perm[ix1 + perm[iy1 + perm[iz1]]], fx1, fy1, fz1);
        nx1 = mix( nxy0, nxy1, r );

        n1 = mix( nx0, nx1, t );

        return 0.936 * ( mix( n0, n1, s ) );
    };

    pkg.periodic4 = function(x, y, z, w, px, py, pz, pw){
        var ix0, iy0, iz0, iw0, ix1, iy1, iz1, iw1; // int
        var fx0, fy0, fz0, fw0, fx1, fy1, fz1, fw1; // float
        var s, t, r, q; // float
        var nxyz0, nxyz1, nxy0, nxy1, nx0, nx1, n0, n1; //float

        ix0 = floor( x ); // Integer part of x
        iy0 = floor( y ); // Integer part of y
        iz0 = floor( z ); // Integer part of y
        iw0 = floor( w ); // Integer part of w
        fx0 = x - ix0;        // Fractional part of x
        fy0 = y - iy0;        // Fractional part of y
        fz0 = z - iz0;        // Fractional part of z
        fw0 = w - iw0;        // Fractional part of w
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        fz1 = fz0 - 1.0;
        fw1 = fw0 - 1.0;
        ix1 = (( ix0 + 1 ) % px ) & 0xff;  // Wrap to 0..px-1 and wrap to 0..255
        iy1 = (( iy0 + 1 ) % py ) & 0xff;  // Wrap to 0..py-1 and wrap to 0..255
        iz1 = (( iz0 + 1 ) % pz ) & 0xff;  // Wrap to 0..pz-1 and wrap to 0..255
        iw1 = (( iw0 + 1 ) % pw ) & 0xff;  // Wrap to 0..pw-1 and wrap to 0..255
        ix0 = ( ix0 % px ) & 0xff;
        iy0 = ( iy0 % py ) & 0xff;
        iz0 = ( iz0 % pz ) & 0xff;
        iw0 = ( iw0 % pw ) & 0xff;

        q = fade( fw0 );
        r = fade( fz0 );
        t = fade( fy0 );
        s = fade( fx0 );

        nxyz0 = grad4(perm[ix0 + perm[iy0 + perm[iz0 + perm[iw0]]]], fx0, fy0, fz0, fw0);
        nxyz1 = grad4(perm[ix0 + perm[iy0 + perm[iz0 + perm[iw1]]]], fx0, fy0, fz0, fw1);
        nxy0 = mix( nxyz0, nxyz1, q );

        nxyz0 = grad4(perm[ix0 + perm[iy0 + perm[iz1 + perm[iw0]]]], fx0, fy0, fz1, fw0);
        nxyz1 = grad4(perm[ix0 + perm[iy0 + perm[iz1 + perm[iw1]]]], fx0, fy0, fz1, fw1);
        nxy1 = mix( nxyz0, nxyz1, q );

        nx0 = mix ( nxy0, nxy1, r );

        nxyz0 = grad4(perm[ix0 + perm[iy1 + perm[iz0 + perm[iw0]]]], fx0, fy1, fz0, fw0);
        nxyz1 = grad4(perm[ix0 + perm[iy1 + perm[iz0 + perm[iw1]]]], fx0, fy1, fz0, fw1);
        nxy0 = mix( nxyz0, nxyz1, q );

        nxyz0 = grad4(perm[ix0 + perm[iy1 + perm[iz1 + perm[iw0]]]], fx0, fy1, fz1, fw0);
        nxyz1 = grad4(perm[ix0 + perm[iy1 + perm[iz1 + perm[iw1]]]], fx0, fy1, fz1, fw1);
        nxy1 = mix( nxyz0, nxyz1, q );

        nx1 = mix ( nxy0, nxy1, r );

        n0 = mix( nx0, nx1, t );

        nxyz0 = grad4(perm[ix1 + perm[iy0 + perm[iz0 + perm[iw0]]]], fx1, fy0, fz0, fw0);
        nxyz1 = grad4(perm[ix1 + perm[iy0 + perm[iz0 + perm[iw1]]]], fx1, fy0, fz0, fw1);
        nxy0 = mix( nxyz0, nxyz1, q );

        nxyz0 = grad4(perm[ix1 + perm[iy0 + perm[iz1 + perm[iw0]]]], fx1, fy0, fz1, fw0);
        nxyz1 = grad4(perm[ix1 + perm[iy0 + perm[iz1 + perm[iw1]]]], fx1, fy0, fz1, fw1);
        nxy1 = mix( nxyz0, nxyz1, q );

        nx0 = mix( nxy0, nxy1, r );

        nxyz0 = grad4(perm[ix1 + perm[iy1 + perm[iz0 + perm[iw0]]]], fx1, fy1, fz0, fw0);
        nxyz1 = grad4(perm[ix1 + perm[iy1 + perm[iz0 + perm[iw1]]]], fx1, fy1, fz0, fw1);
        nxy0 = mix( nxyz0, nxyz1, q );

        nxyz0 = grad4(perm[ix1 + perm[iy1 + perm[iz1 + perm[iw0]]]], fx1, fy1, fz1, fw0);
        nxyz1 = grad4(perm[ix1 + perm[iy1 + perm[iz1 + perm[iw1]]]], fx1, fy1, fz1, fw1);
        nxy1 = mix( nxyz0, nxyz1, q );

        nx1 = mix ( nxy0, nxy1, r );

        n1 = mix( nx0, nx1, t );

        return 0.87 * ( mix( n0, n1, s ) );

    };

    return pkg;
}
