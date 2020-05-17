import { swplnsym, swhitsym, swwinsym, swbmbsym, swtrgsym, swhtrsym, swexpsym, swflksym, swbrdsym, swoxsym, swmscsym, swbstsym } from './art/swsym.js'
import {balloonsym12, basketsym12, bonusessym12 } from './art/pixel12.js'

const DefaultPalette = [
    [0,0,0],       // always transparent
    [0,200,255],   // light blue
    [255,0,255],   // pink
    [255,255,255], // always white
]

/*
 * swsym
 */
function symboltoimage( odata, w, h, palette = DefaultPalette ){
    const $canvas = document.createElement('canvas')
    $canvas.width = w
    $canvas.height = h
    const $ctx = $canvas.getContext('2d')
    const imageData = $ctx.getImageData(0, 0, $canvas.width, $canvas.height);
    const data = imageData.data;
    for (let i = 0, j = 0; i < odata.length; i++) {
        let q = odata[ i ];
        ;[ (q & 0xc0) >> 6,
           (q & 0x30) >> 4,
           (q & 0x0c) >> 2,
           (q & 0x03) ].forEach( (c) => {
               let rgb = palette[ c ]
               data[ j++ ] = rgb[ 0 ]
               data[ j++ ] = rgb[ 1 ]
               data[ j++ ] = rgb[ 2 ]
               data[ j++ ] = c?255:0
           })
    }
    $ctx.putImageData(imageData, 0, 0);
    //    document.body.appendChild( $canvas )
    
    // return imageData
    
    //
    
    var img = document.createElement("img");
    img.src = $canvas.toDataURL("image/png");
    return img;
}

function symboltohitmask(odata,w,h){
    let hm = new Array( w ).fill(0).map( () => [] )
    let x = 0
    let y = ( h - 1 )
    for (let i = 0, j = 0; i < odata.length; i++) {
        let q = odata[ i ];
        ;[ (q & 0xc0) >> 6,
           (q & 0x30) >> 4,
           (q & 0x0c) >> 2,
           (q & 0x03) ].forEach( (c,q) => {
               if ( x === w ){
                   x = 0
                   y--
               }
               hm[ x ][ y ] = c?true:false
               x++
           })
    }
    let hitmask = { mask : hm, w, h }
    //console.log(hitmask)
    return hitmask
}

function symboltobottomhitmask( odata, w, h ){

    let hm = new Array( w ).fill(0).map( () => h  )
    let x = 0
    let y = ( h - 1 )
    let min = ( h - 1 )
    for (let i = 0, j = 0; i < odata.length; i++) {
        let q = odata[ i ];
        ;[ (q & 0xc0) >> 6,
           (q & 0x30) >> 4,
           (q & 0x0c) >> 2,
           (q & 0x03) ].forEach( (c,q) => {
               if ( x === w ){
                   x = 0
                   y--
               }
               if ( c ){
                   if ( y < hm[ x ] ) {
                       hm[ x ] = y
                       if ( y < min ){
                           min = y
                       }
                   }
               }
               x++
           })
    }
    let hitmask = { mask : hm, w, h, min }
    return hitmask
}

/*
 * pixel12
 */
/*
 * .1. 
 * 121   -> 0 1 0 1 2 1 0 1 0
 * .1.
 *
 */
function txt12toPixel12( txt ){
    const pixel12 = []
    const replacements = { '.' : 0 ,'1' : 1 ,'2' : 2 }
    const allowed = Object.keys( replacements )
    return txt.split('')
        .filter( c => allowed.find( a => a === c ) )
        .map( c => replacements[ c ] )    
}
/*
 *
 *  w, h + palette + 0 1 0 1 2 1 0 1 0 -> img(w,h)
 *
 */
function pixel12toimage( pixel12data, w, palette = DefaultPalette ){
    const $canvas = document.createElement('canvas')
    $canvas.width = w
    const h = Math.floor( pixel12data.length / w )
    $canvas.height = h
    const $ctx = $canvas.getContext('2d')
    const imageData = $ctx.getImageData(0, 0, $canvas.width, $canvas.height);
    const data = imageData.data;
    let j = 0
    pixel12data.forEach( num => {
        let rgb = palette[ num ]
        data[ j++ ] = rgb[ 0 ]
        data[ j++ ] = rgb[ 1 ]
        data[ j++ ] = rgb[ 2 ]
        data[ j++ ] = num?255:0
    })
    $ctx.putImageData( imageData, 0, 0 );   
    var img = document.createElement("img");
    img.src = $canvas.toDataURL("image/png");
    // document.body.appendChild( img )
    return img;
}
function pixel12toHitMask( pixel12data, w, h ){
    let mask= new Array( w ).fill(0).map( () => new Array( h ).fill( 0 ).map( () => false ) )
    const bounds = { x1 : w, y1 : h, x2 : 0, y2 : 0, w : 0, h : 0 }
    pixel12data.forEach( (c,i) => {
        const x = i % w,
              y = Math.floor( i / w )
        if ( c !== 0 ){
            if ( x < bounds.x1 ) bounds.x1 = x
            if ( ( x + 1 ) > bounds.x2 ) bounds.x2 = x + 1
            if ( y < bounds.y1 ) bounds.y1 = y
            if ( ( y + 1 ) > bounds.y2 ) bounds.y2 = y + 1
            mask[ x ][ y ] = true
        }
    })
    bounds.x1 = Math.min( bounds.x1, bounds.x2 )
    bounds.y1 = Math.min( bounds.y1, bounds.y2 )
    bounds.w = bounds.x2 - bounds.x1
    bounds.h = bounds.y2 - bounds.y1
    return { mask, bounds }
}
function pixel12toBottomHitMask( pixel12data, w ){
    
    const h = Math.floor( pixel12data.length / w ) 

    let bmask = new Array( w ).fill(0).map( () => h  )
    const bounds = { x1 : w, x2 : 0, w : 0 }
    pixel12data.forEach( (c,i) => {
        const x = i % w,
              y = Math.floor( i / w )
        if ( c !== 0 ){
            if ( y < bmask[ x ] ) bmask[ x ] = y
            if ( x < bounds.x1 ) bounds.x1 = x
            if ( ( x + 1 ) > bounds.x2 ) bounds.x2 = x + 1
        }
    })
    bounds.x1 = Math.min( bounds.x1, bounds.x2 )
    bounds.w = bounds.x2 - bounds.x1
    return { mask : bmask, bounds }
}
/*
 * prepare functions
 */
export function prepareHitmask(){
    const hitmask = {
        plane : swplnsym.map( r => r.map( angle => symboltohitmask( angle, 16, 16 ) ) ),
        targets : swtrgsym.map( type => symboltohitmask( type, 16, 16 ) ),
        target_hit : symboltohitmask( swhtrsym, 16,16),
        bomb : swbmbsym.map( x => symboltohitmask( x, 8, 8 ) ),
        missile : swmscsym.map( x => symboltohitmask( x, 8, 8 ) ),
        flock : swflksym.map( x => symboltohitmask( x, 16, 16 ) ),
        bird : swbrdsym.map( x => symboltohitmask( x, 4, 2 ) ),
        ox : swoxsym.map( type => symboltohitmask( type, 16, 16 ) ),
        debris : swexpsym.map( x => symboltohitmask( x, 8, 8 ) ),
    }
    return hitmask
}

export function prepareBottomHitmask(){
    const hitmask = {
        plane : swplnsym.map( r => r.map( angle => symboltobottomhitmask( angle, 16, 16 ) ) ),
        targets : swtrgsym.map( type => symboltobottomhitmask( type, 16, 16 ) ),
        target_hit : symboltobottomhitmask( swhtrsym, 16, 16 ),
        bomb : swbmbsym.map( x => symboltobottomhitmask( x, 8, 8 ) ),
        missile : swmscsym.map( x => symboltobottomhitmask( x, 8, 8 ) ),
        debris : swexpsym.map( x => symboltobottomhitmask( x, 8, 8 ) ),
        balloon : balloonsym12.map( x => pixel12toBottomHitMask( txt12toPixel12( x ), 16, 16 ) ),
        basket : basketsym12.map( x => pixel12toBottomHitMask( txt12toPixel12( x ), 16, 16 ) ),
        flock : swflksym.map( x => symboltobottomhitmask( x, 16, 16 ) ),
        ox : swoxsym.map( x => symboltobottomhitmask( x, 16, 16 ) ),
        bonuses : bonusessym12.map( type => type.map(
            ({w,pixel12}) => pixel12toBottomHitMask( pixel12, w )
        ))

    }
    return hitmask
    
}

/*
 *
 */
import { hslToRgb } from './utils.js'

function pal1c( h ){    
    let circle = (h + 0.5)%1
    const pal = [
        [0,0,0,0],     // not black but transparent
        hslToRgb(h,0.6,0.5),
        hslToRgb(circle,0.6,0.5),
        [255,255,255], // mandatory white
    ]
    return pal
}
function colschn( n ){
    return new Array( n )
        .fill( 0 )
        .map( (_,i) => i / n )
        .map( pal1c )
}

export const ColorSchemes = [ DefaultPalette, ...colschn( 8 ) ]

export function prepareImages(){
    const sym = {
        plane : ColorSchemes.map( pal => swplnsym.map( r => r.map( a => symboltoimage( a, 16, 16, pal ) ) )),
        targets : ColorSchemes.map( pal => swtrgsym.map( type => symboltoimage( type, 16, 16, pal ) )),
        target_hit : ColorSchemes.map( pal => symboltoimage( swhtrsym, 16,16, pal ) ),
        ox : swoxsym.map( type => symboltoimage( type, 16, 16 ) ),
        debris : ColorSchemes.map( pal => swexpsym.map( x => symboltoimage( x, 8, 8, pal ) )),
        flock : swflksym.map( x => symboltoimage( x, 16, 16 ) ),
        bird : swbrdsym.map( x => symboltoimage( x, 4, 2 ) ),
        bomb : ColorSchemes.map( pal => swbmbsym.map( x => symboltoimage( x, 8, 8, pal ) ) ),
        missile : ColorSchemes.map( pal =>  swmscsym.map( x => symboltoimage( x, 8, 8, pal ) )),
        guidedmissile : ColorSchemes.map( pal =>  swmscsym.map( x => symboltoimage( x, 8, 8, pal ) )),
        burst : swbstsym.map( x => symboltoimage( x, 8, 8 ) ),
        plane_hit : ColorSchemes.map( pal => swhitsym.map( x => symboltoimage( x, 16, 16, pal ) ) ),
        plane_win : ColorSchemes.map( pal => swwinsym.map( x => symboltoimage( x, 16, 16, pal ) ) ),
        balloon : ColorSchemes.map( pal => balloonsym12.map( x => pixel12toimage( txt12toPixel12( x ), 16, pal ) ) ),
        basket : ColorSchemes.map( pal => basketsym12.map( x => pixel12toimage( txt12toPixel12( x ), 16, pal ) ) ),
        bonuses : ColorSchemes.map( pal => bonusessym12.map( type => type.map(
            ({w,pixel12}) => pixel12toimage( pixel12, w, pal )
        )))
    }
    return sym
}
export function prepareDimensions(){
    const sym = {
        plane : swplnsym.map( r => r.map( a16 => ({w:16,h:16}))),
        targets : swtrgsym.map( tt => ({w:16,h:16})),
        target_hit : ({w:16,h:16}),
        ox : swoxsym.map( as => ({w:16,h:16})),
        debris : swexpsym.map( dt => ({w:8,h:8})),
        flock : swflksym.map( as => ({w:16,h:16})),
        bird : swbrdsym.map( x =>  ({w:4,h:2})),
        bomb : swbmbsym.map( a8 =>  ({w:8,h:8})),
        missile :  swmscsym.map( x =>  ({w:8,h:8})),
        guidedmissile :  swmscsym.map( x =>  ({w:8,h:8})),
        burst : swbstsym.map( x => ({w:8,h:8})),
        plane_hit : swhitsym.map( x => ({w:16,h:16})),
        plane_win : swwinsym.map( x => ({w:16,h:16})),
        balloon : balloonsym12.map( x => ({w:16,h:16})),
        basket : basketsym12.map( x => ({w:16,h:16})),
        bonuses : bonusessym12.map( type => type.map( step => {
            const { w, pixel12 } = step
            return { w, h : Math.floor(pixel12.length/w) }
        })),
    }
    return sym
}

/*
 * Infos
 * iparams for params needed to define image
 * bmparams          ...               bottom hitmap 
 * dparams          ...                sprite for display
 */
export const SpriteInfosByTypeNum = [
    { type : 'plane', dimparams:['r','a16'],/* w : 16, h : 16 , */ iparams : ['cs','r','a16'], bmparams : [ 'r','a16' ], dparams : [ 'sprt','cs','r','a16' ] },
    { type : 'targets',  dimparams:['tt'],/* w : 16, h : 16 , */ iparams : ['cs','tt'], bmparams : [ 'tt' ], dparams : [   'sprt','cs','tt' ] },
    { type : 'target_hit',  dimparams:[],/* w : 16, h : 16 , */ iparams : ['cs'], bmparams : [ ]   , dparams : [  'sprt','cs' ] },
    { type : 'ox',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['as'], bmparams : ['as'] , dparams : [  'sprt','as' ] },
    { type : 'debris',  dimparams:['dt'],/* w : 8, h : 8 , */ iparams : ['cs','dt'], bmparams : ['dt'], dparams : [  'sprt','cs','dt' ] },
    { type : 'flock',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['as'], bmparams : ['as'], dparams : [  'sprt','as' ] },
    { type : 'bird',  dimparams:['as'],/* w : 4, h : 2 , */ iparams : ['as'], dparams : [  'sprt','as' ] }, //
    { type : 'bomb',  dimparams:['a8'],/* w : 8, h : 8 , */ iparams : ['cs','a8'], bmparams : ['a8'], dparams : [  'sprt','cs','a8' ] },
    { type : 'missile',  dimparams:['a16'],/* w : 8, h : 8 , */ iparams : ['cs','a16'], bmparams : ['a16'], dparams : [  'sprt','cs','a16' ] },
    { type : 'guidedmissile',  dimparams:['a16'],/* w : 8, h : 8 , */ iparams : ['cs','a16'], dparams : [  'sprt','cs','a16' ] },
    //{ type : 'burst',  dimparams:[],/* w :8, h : 8 , */ iparams : ['a'] },, dparams : [ 'sprt','cs','r','a16' ] },
    { type : 'plane_hit',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['as'], dparams : [  'sprt','cs','as' ] }, //
    { type : 'plane_win',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['cs','as'], dparams : [  'sprt','cs','as' ] },//
    { type : 'balloon',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['cs','as'], bmparams : ['as'], dparams : [  'sprt','cs','as' ] },
    { type : 'basket',  dimparams:['as'],/* w : 16, h : 16 , */ iparams : ['cs','as'], bmparams : ['as'], dparams : [  'sprt','cs','as' ] },
    { type : 'bonuses',  dimparams:['bt','as'],/* w : 16, h : 16 , */ iparams : ['cs','bt','as'],  bmparams : ['bt','as'], dparams : [ 'sprt','cs','bt','as' ] },
]
export const SpriteTypeNum = SpriteInfosByTypeNum.reduce( (r, x, i) => { 
    r[ x.type ] = i
    return r
}, { })
export const SpriteTypeName = SpriteInfosByTypeNum.reduce( (r, x, i) => { 
    r[ i ] = x.type
    return r
}, [])
export const SpriteInfosByTypeName = SpriteInfosByTypeNum.reduce( (r, x, i) => { 
    r[ x.type ] = x
    return r
}, { })

export function symbGetInArray( array, prop = 'iparams' ){

    return function( spriteTypeNum, params ){
        const sprInfos = SpriteInfosByTypeNum[ spriteTypeNum ]
        if ( sprInfos[ prop ] === undefined ){
            console.log('symbGetInArray1',{array,prop,spriteTypeNum,params})
        }
        return sprInfos[ prop ].reduce( (r, p) => {
            const v = params[ p ]
            if ( !r ){
                console.log('ERROR ! SPRITE PROP !',{array,prop,spriteTypeNum,params})
            }
            const l = (r.length)?(r.length):1
            return r[v%l]
        }, array[  sprInfos.type ] )
    }
}
export function symbFilterProps( prop = 'iparams', props ){

    if ( SpriteInfosByTypeNum[ props.sprt ] === undefined ){
        console.log("undefined sprite prop", { prop, props, SpriteInfosByTypeNum } )
    }
    const pNames = SpriteInfosByTypeNum[ props.sprt ][ prop ]
    return pNames.reduce( ( r,x ) => {
        r[ x ] = props[ x ]
        return r
    },{})
    
}
export const TARGETS_TYPE = {
    'base' : 0,
    'factory ': 1,
    'reservoir': 2,
    'tank' : 3,
}
export const DEBRIS_TYPE_COUNT = 8

// console.log( { SpriteInfosByTypeNum,  SpriteInfosByTypeName,  SpriteTypeNum, SpriteTypeName, symbFilterProps} )
console.log({SpriteTypeNum})
