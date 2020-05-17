import { prepareImages, ColorSchemes, symbGetInArray } from './symbols.js'
import { clamp, length } from './utils.js'
import { worldSize, HEIGHTMAP_TYPE } from './game.js'
import BezierEasing from 'bezier-easing'
import { DEBUG_BOUNDING_BOXES, DEBUG_COLLISIONS } from './game.js'

const Images = prepareImages()
const getImage = symbGetInArray( Images, 'iparams' )

const DEBUG_PLAYER_ID = true
const POSITION_HELPER_DURATION = 3500

function getRandomColor() {
    if (Math.random()>0.5){
        return 'black'
    } else {
        return 'white'
    }
    
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function LeaderBoardDisplay(){
    const MAX_DISPLAYED = 10
    
    function $buildContainer(){
        let $div = document.createElement('pre') 
        $div.style = 'position:fixed;display:block;color:white;z-index:25;'
            +'width:auto;height:auto;'
            +'right:0px;top:0px;'
            +'opacity:0.9'
            +';margin:0px;padding-left:1em;padding-right:1em;'
            +'background-color:rgb(130, 98, 50,0.5);'
            +'border-bottom-left-radius:15px;'
        $div.classList.add('noselect')
        return $div
    }
    const $div = $buildContainer()
    document.body.appendChild( $div )
    
    function hide(){
        state.visible = false
        $div.style.visibility = 'collapse'
    }
    function show(){
        state.visible = false
        display()
        $div.style.visibility = 'visible'
    }
    function update( leaderboard ){

        let width1 = clamp(leaderboard.reduce(
            (r,{username}) => Math.max( r, username.length ),
            0
        ),8,32)
        
        let width2 = clamp(leaderboard.reduce(
            (r,{score}) => Math.max( r, score.toString().length ),
            0
        ),4,20)
        $div.innerHTML = leaderboard
            .sort( (a,b) => b.score - a.score )
            .slice(0,MAX_DISPLAYED)
            .map( x => ['<p>',
                        ([
                            x.username.padEnd( width1,' ' ),
                            x.score.toString().padStart( width2,' ')
                        ].join(' ')),
                        '</p>'
                       ].join(''))
            .join('')


    }
    return { hide, show, update }
}
const leaderboardDisplay = LeaderBoardDisplay()



function setCanvasDimensions( canvas, previousDimensions ) {
    // On small screens (e.g. phones), we want to "zoom out" so players can still see at least
    // 200 in-game units of width.
    const scaleRatio = Math.max( 1, 200 / window.innerWidth )
    const width = Math.floor( scaleRatio * window.innerWidth ) 
    const height = Math.floor( scaleRatio * window.innerHeight )
    if ( ( canvas.width === width ) && ( canvas.height === height ) ){
        return
    } 
    canvas.width = width
    canvas.height = height

}

import { Island } from './object/island.js'


function Stars(){

    /*
     * background stars
     */
    // fixed points needed when the ground is not visible
    function init_stars(){
        const count = 100
        const stars = new Array( count ).fill( 0 ).map( (_,i) => {
            // evenly spaced plus random
            const x = worldSize.x1 + ( i / count * worldSize.w )
                  + ( ( Math.random() * 2 - 1 ) * ( worldSize.w / count / 4 ) )
            // push to top
            const y = worldSize.y1 + Math.pow( Math.random(), 0.6 ) * worldSize.h
            const brightness = Math.floor( Math.random() * 3 )
            return { x, y, brightness }
        })
        return stars
    }
    const stars = init_stars()
    function update_stars( ){
        if (stars){
            // change one by turn
            let star = stars[ Math.floor( Math.random() * stars.length ) ]
            if (star){
                let b = star.brightness
                if ( b === 0 ){
                    star.brightness = 1
                } else if ( b === 2 ){
                    star.brightness = 1
                } else {
                    if (Math.random()<0.5){
                        star.brightness = 0
                    } else {
                        star.brightness = 2
                    }
                }
            }
        }
    }
    function display( $context, world_to_context ){
        if (stars){
            if (Math.random()>0.90){
                update_stars( stars )
            }
            //const bcolors = [ '#faff', '#a59a', '#0095' ]
            const bcolors = [ 'red','violet','white' ]
            stars.forEach( ({x,y,brightness}) => {
                let cxy = world_to_context( x, y )
                $context.beginPath()
                $context.fillStyle = bcolors[ brightness ]
                $context.fillRect( cxy.x, cxy.y, 1,1)                
            })
        }
    }

    init_stars()
    return { update : update_stars, display }
}
/*
 * missile & explosion trails
 */

const TrailColors = {
    guidedmissiles : '#886500',
    missiles : '#656',
    debris : 'white',
    falling1 : 'orange',
    falling2 : 'cyan',
}
function TrailPoints(){
    const trailPoints = new Array( 500 ).fill(0).map( x => undefined )
    let currentTrailPointIdx = 0
    function display( world_to_context, $context ){
        const now = Date.now()
        const minAge = 130
        const maxAge = 1000
        trailPoints.filter( x => x !== undefined ).forEach( pt => {
            const {ox, oy, x,y,color,spread,size,date, expl} = pt
            const age = now - date
            if ( ( age > minAge) && ( age < maxAge ) ){
                const prog =  1 - ( (age - minAge) / (maxAge-minAge) )
                let cxy = world_to_context( x, y )
                $context.beginPath()
                $context.fillStyle = color
                const r1 = ( Math.random() - 0.5 ) * 2 * spread
                const r2 = ( Math.random() - 0.5 ) * 2 * spread
                const s = size * prog
                const ss = -1 * s/4
                //$context.fillRect( cxy.x + r1 -ss, cxy.y+r2-ss, s, s)
                const nx = cxy.x + r1 + ss,
                      ny = cxy.y + r2 + ss
                pt.x += r1 + ss
                pt.y += r2 + ss
                $context.fillRect( nx, ny , s, s )
            }
        })
    }
    function add(x,y,color,spread,size,expl){
        if ( trailPoints.length ){
            trailPoints[ currentTrailPointIdx ] = { ox : x, oy : y, x, y, color, spread, size, date : Date.now(), expl }
            currentTrailPointIdx = ( currentTrailPointIdx + 1 ) % trailPoints.length        
        }
    }
    return { add, display }
}
function findPlayerPosition( State ){
    if ( State === undefined ) return
    const me = State.me
    if ( me === undefined ) return 
    const meId = me.id
    if ( meId === undefined ) return
    for ( let [a,k] of Object.entries( State ) ){
        if ( Array.isArray( k ) ){
            const found = k.find( item => {
                if ( item && item.id && (item.id === meId )){
                    return item
                }
            })
            if ( found !== undefined )
                return found
        }
    }
}
function getWorldWindow( center, $canvas, worldSize ){
    const { x, y } = center
    const { width, height } = $canvas
    const { x1, x2, y1, y2 } = worldSize
    const left = clamp(
        x -  width / 2,
        x1,
        x2 - width
    )
    const right = left +  width
    const bottom = clamp(
        y - height /  2,
        y1,
        y2 -  height
    )   
    const top = bottom +  height
    const worldWindow = { left, right, bottom, top, width, height }
    return worldWindow
}
function Camera(){

    const freeRoamDelay = 2000

    function MakeupTarget( changePeriod ){
        const position = { x : undefined, y : undefined }
        let creationDate = 0
        function setRandom( worldSize ){
            position.x = worldSize.x1 + worldSize.w * Math.random()
            position.y = worldSize.y1 + worldSize.h * Math.random()
            creationDate = Date.now()
        }
        function update( worldSize ){
            if ( ( Date.now() - creationDate ) > ( changePeriod * 1000 ) )
                setRandom( worldSize )
        }       
        return { update, position }
    }

    const makeupTarget = MakeupTarget( 2 )
    let userTarget = undefined,
        lastUserTargetDate = undefined,
        position = undefined
    
    function setTarget( position ){
        if ( ( position !== undefined )
             && ( position.x !== undefined )
             && ( position.y !== undefined ) ){
            userTarget = { x : position.x, y : position.y }
            lastUserTargetDate = Date.now()
        } else {
            if ( lastUserTargetDate === undefined ){
                lastUserTargetDate = Date.now()
            }
            userTarget = undefined
        }
    }
    function update( worldSize ){
        makeupTarget.update( worldSize )

        let target
        let way
        if ( userTarget !== undefined ){
            // use user targt
            target = userTarget
        } else {
            const elapsedWithoutUserTarget = 
                  ( Date.now() - lastUserTargetDate )
            
            if ( elapsedWithoutUserTarget > freeRoamDelay ){
                // use free roam after a while
                target = makeupTarget.position
            } else if ( position !== undefined ){
                // before that, do not move if already somewhere
                target = position
            } else { 
                // no old position to use, take center of the world
                target = {
                    x : ( worldSize.x1 + worldSize.x2 ) / 2,
                    y : ( worldSize.y1 + worldSize.y2 ) / 2
                }
            }
        }
        
        if ( position === undefined ) { 
            position = { x : target.x, y : target.y }
        }
        
        let dx = target.x - position.x
        let dy = target.y - position.y
        let md = Math.abs( dx ) + Math.abs( dy )
        let ratio = 0.05
        let threshold = 200
        position.x = Math.floor( position.x + dx * ratio )
        position.y = Math.floor( position.y + dy * ratio )
    }
    return { setTarget, update, getPosition : () => position }
}

function CanvasPositionTracker( abuptThresholdSq = Math.pow( 10, 2 ) ){
    let position = undefined,
        lastAbruptChange = undefined
    function setPosition( p ){
        //console.log('position set',{x,y})
        if ( ( p === undefined ) || ( p.x === undefined ) || ( p.y === undefined ) ){
            lastAbruptChange = Date.now()
        } else {
            const { x, y } = p
            if ( position !== undefined ){
                const dist = Math.pow( position.x - x, 2 ) + Math.pow( position.y - y, 2 )
                if ( dist > abuptThresholdSq ){
                    lastAbruptChange = Date.now()
                }
            } else {
                lastAbruptChange = Date.now()
            }
            position = { x, y }
        }
    }
    function elapsedSinceLastAbruptChange(){
        return ( Date.now() - lastAbruptChange )
        
    }
    return { setPosition, elapsedSinceLastAbruptChange }
}

export function Display() {


    let State

    const stars = Stars()
    const trailPoints = TrailPoints()

    
    
    const $canvas = document.createElement('canvas')
    $canvas.classList.add('game')
    $canvas.width = 800//100//320
    $canvas.height = 600//200
    document.body.appendChild( $canvas )
    const $context = $canvas.getContext('2d')

    function putSprite( image, x, y ){

        if ( !image )
            return
        
        $context.drawImage(
            image,
            x - image.width / 2 ,
            y - image.height / 2,
            image.width,
            image.height,
        )
        
    }
    const camera = Camera()
    const positionTracker = CanvasPositionTracker()
    const positionHelperEasing = BezierEasing(1.000, 0, 0, 1 )

    function display(){

        $context.imageSmoothingEnabled = false
        
        setCanvasDimensions( $canvas )


        if ( !State ) {
            return
        }
        
        const leaderboard = State.leaderboard
        if ( leaderboard ){
            leaderboardDisplay.update( leaderboard ) 
        }

        //const me = State.me

        /*
         * camera
         */
        const cameraTarget = findPlayerPosition( State )
        camera.setTarget( cameraTarget )
        camera.update( worldSize )

        /* 
         * world window and transformation
         */
        const worldWindow = getWorldWindow( camera.getPosition(), $canvas, worldSize )
        function world_to_context( x, y ){
            return {
                x : x - worldWindow.left  ,
                y : $canvas.height - y  + worldWindow.bottom
            }
        }
        
        /*
         * perceived position helper
         * 0 does not show 
         * ...
         * 1 fully show
         */ 
        let showPositionHelper, positionHelperShowRatio
        {
            if ( ( cameraTarget )
                 && ( cameraTarget.x !== undefined )
                 && ( cameraTarget.y !== undefined ) ){
                const { x,y } = cameraTarget
                positionTracker.setPosition( world_to_context( x, y ) )
            }
            const elapsed = positionTracker.elapsedSinceLastAbruptChange()
            positionHelperShowRatio = positionHelperEasing(
                1 - clamp( elapsed / POSITION_HELPER_DURATION, 0, 1 )
            )
            showPositionHelper = elapsed < POSITION_HELPER_DURATION 
        }
        
        function drawWorldRectangle( x, y, w, h, style ){
            let wxy = world_to_context( x, y )
            {
                $context.beginPath()
                $context.strokeStyle = style
                const x = wxy.x - w / 2,
                      y = wxy.y - h / 2
                $context.strokeRect( x, y, w, h )
            }
        }

        // sky
        let drawZone
        {
        }
        {
            $context.beginPath()
            $context.fillStyle = 'black'            
            $context.fillRect( 0, 0, $canvas.width, $canvas.height )
            if (false){
                let cxy = world_to_context( worldSize.x1, worldSize.y1 )


                // top left bottom right
                const { x1,x2,y1,y2,w,h } = worldSize
                const bl = world_to_context( worldSize.x1, worldSize.y2 )
                const tr = world_to_context( worldSize.x2,  worldSize.y1 )
                bl.x = clamp( bl.x , 0, $canvas.width )
                tr.x = clamp( tr.x , 0, $canvas.width )
                bl.y = clamp( bl.y , 0, $canvas.height )
                tr.y = clamp( tr.y , 0, $canvas.height )

                //     $context.fillStyle = 'SkyBlue'
                //   $context.fillRect( bl.x, bl.y, tr.x, tr.y )
                
            }
            
            
        }

        // stars
        stars.display( $context, world_to_context )

        // trail points
        trailPoints.display( world_to_context,  $context )

        const heightmaps = State.heightmaps
        if ( heightmaps ){
            heightmaps.forEach( heightmap => {
                if ( heightmap.type === HEIGHTMAP_TYPE.island ){
                    // island
                    // TODO : cache
                    const island =  Island( heightmap )                                
                    $context.beginPath()
                    $context.fillStyle = 'green'
                    for ( let i = 0 ; i <= $canvas.width ; i++ ){
                        const wx = worldWindow.left + i
                        let wy = island.heightAt( heightmap, Math.round( worldWindow.left + i ) )
                        let wy0 = heightmap.y - island.getDimensions( heightmap ).h / 2
                        
                        if ( wy !== undefined ){
                            let cxy = world_to_context( wx, wy )
                            let cxy0 = world_to_context( wx, wy0 )
                            $context.fillRect(Math.floor(i),
                                              Math.floor(cxy.y),
                                              Math.floor(1),
                                              Math.abs( Math.floor(cxy0.y) - Math.floor(cxy.y) ))
                        }
                    }
                } else if (  heightmap.type === HEIGHTMAP_TYPE.water ){
                    // water                                        
                    $context.beginPath()
                    $context.fillStyle = 'blue'
                    const { hmin, hmax } = heightmap
                    for ( let i = 0 ; i <= $canvas.width ; i++ ){
                        const wx = worldWindow.left + i
                        let wy = hmax
                            + Math.sin( wx / 16 + Math.sin( Date.now() / 1000 ) )
                            * Math.sin( Date.now() / 400 )
                            * 2
                        let cxy = world_to_context( wx, wy )                
                        $context.fillRect(Math.floor(i),
                                          Math.floor(cxy.y),
                                          Math.floor(1),
                                          Math.ceil($canvas.height - cxy.y))
                    }
                }
            })
        }
        
        
        // ground
        const ground = State.ground
        if ( ground ){
            $context.beginPath()
            $context.fillStyle = 'green'
            let lastwy = 0
            let asLine = false
            for ( let i = 0 ; i <= $canvas.width ; i++ ){
                let wx = worldWindow.left  + i
                let wy = (wx<0)?(Math.random()*10):ground[ Math.floor( wx ) % ground.length ]        
                let cxy = world_to_context( wx, wy )
                if ( asLine ){
                    
                    lastwy = wy
                } else {
                    $context.fillRect(Math.floor(i),
                                      Math.floor(cxy.y),
                                      Math.floor(1),
                                      Math.ceil($canvas.height - cxy.y))
                }
            }
        }
        
        const targets = State.targets
        if ( targets ) {
            for ( let i = 0, l = targets.length ; i < l ; i++ ){

                const target = targets[i]
                const { x, y, as, broken } = target
                let wxy = world_to_context( x, y )
                putSprite( getImage( target.sprt, target ), wxy.x , wxy.y )
                
                /*
                //if ( ttl > 0 ){
                if ( broken ){
                putSprite( Images.target_hit, wxy.x , wxy.y )
                } else {
                putSprite( Images.targets[as], wxy.x , wxy.y )
                }*/
                //}
            }
        }
        const planes = State.planes
        if ( planes ){
            State.planes.forEach( (plane) => {
                const { human, reckless, age, ttl, x, y, r, a, p, cs, score, value,  name } = plane,
                      wxy = world_to_context( x, y )
                
                const isCameraTarget = ( cameraTarget && ( cameraTarget.id === plane.id ) )
                if ( showPositionHelper ){
                    const r = positionHelperShowRatio
                    if ( r > 0.5 ){
                        $context.beginPath()
                        $context.strokeStyle = `rgba(255,255,128,${ 0.5 * r })`
                        $context.lineWidth = 16 * r
                        $context.arc( wxy.x, wxy.y, r * 64, 0, 2 * Math.PI )
                        $context.stroke()
                        $context.closePath()
                    }
                }
                
                if ( plane.lf < 0 ){
                    trailPoints.add( x, y,  TrailColors.falling, 3, 2 )
                }
                if ( plane.dmg ){
                    trailPoints.add( x, y,  TrailColors.debris, 4, 2 )
                }
                if ( ttl < 0 ){
                    return
                }
                $context.beginPath()
                $context.fillStyle = 'black'

                let va = a
                let vr = r?1:0

                const img = getImage( plane.sprt, plane )
                if ( reckless ){
                    if ( Math.floor((age/2))%2 ){
                        putSprite( img, wxy.x  , wxy.y )
                    } 
                } else {
                    putSprite( img, wxy.x  , wxy.y )

                    // drawWorldRectangle( x,y, img.width, img.height, 'red' )
                    
                }
                
                $context.beginPath()
                let col = ColorSchemes[cs][0]
                let rgb = ( human === true )?`rgb(${col[0]},${col[1]},${col[2]})`:'gray'
                $context.fillStyle = rgb
                
                
                $context.font = `${ 10  }px monospace`;

                const inScreen = ( wxy.x >= 0 ) && ( wxy.x <= $canvas.width )
                      && ( wxy.y >= 0 ) && ( wxy.y <= $canvas.height )
                
                //                    const displayString = `${ name } ${ score.total } ${ value }`// ${ human?'human':'💻' } ${ inScreen?'yes':'no'}`
                const displayString = `${ name }`// ${ human?'human':'💻' } ${ inScreen?'yes':'no'}`

                if ( true || inScreen || (human === true) ){
                    
                    const canvasClamped = {
                        x : clamp( wxy.x, 0, $canvas.width - 7 * ( displayString.length + 1 ) ),
                        y : clamp( wxy.y, 0, $canvas.height - 22 )
                    }
                    $context.fillText(displayString,
                                      canvasClamped.x + 8,
                                      canvasClamped.y + 18)

                    //if ( DEBUG_AGE ){
                    /*$context.fillText(`${ name }[${age}](${p})${score.total}/${value}`,
                      wxy.x + 8 , wxy.y + 18 )
                    */
                    //} else {
                    /*
                      $context.fillText(`${ name }(${p})${score.total}/${value}`,
                      wxy.x + 8 , wxy.y + 18 )
                    */
                    
                    /*$context.fillText(`${score.total}`,
                      wxy.x + 8 , wxy.y + 18 )
                    */
                    /*context.fillText(`${ name }`,
                      wxy.x + 8 , wxy.y + 18 )*/
                    
                    //}
                }   
                //}
                
                /*
                  
                  $context.fillText(`${ name }`,// ${Math.floor(x)},${Math.floor(y)},${p}`,
                  wxy.x + 8 , wxy.y + 18 )
                */
            })
        }        
        
        const bombs = State.bombs
        if ( bombs ) {
            for ( let i = 0, l = bombs.length ; i < l ; i++ ){
                const bomb = bombs[i]
                let { x, y } = bomb                
                let wxy = world_to_context( x, y )
                putSprite( getImage( bomb.sprt, bomb ), wxy.x , wxy.y )
            }
        }

        const missiles = State.missiles
        if ( missiles ) {
            for ( let i = 0, l = missiles.length ; i < l ; i++ ){
                const missile = missiles[i]
                let { x, y } = missile                
                let wxy = world_to_context( x, y )
                putSprite( getImage( missile.sprt, missile ), wxy.x , wxy.y )
                trailPoints.add( x, y, TrailColors.missiles, 2, 1 )
            }
        }
        
        const guidedmissiles = State.guidedmissiles
        if ( guidedmissiles ) {
            for ( let i = 0, l = guidedmissiles.length ; i < l ; i++ ){
                const guidedmissile = guidedmissiles[i]
                let { x, y } = guidedmissile                
                let wxy = world_to_context( x, y )
                putSprite( getImage( guidedmissile.sprt, guidedmissile ), wxy.x , wxy.y )
                trailPoints.add( x, y, TrailColors.guidedmissiles, 3, 2 )
            }
        }

        const debris = State.debris
        if (debris){
            for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                let debri = debris[ j ]
                let { x, y, a, ttl, cs, dtype } = debri
                let wxy = world_to_context( x, y )
                if (Math.random()>0.8){
                    trailPoints.add( x, y,TrailColors.debris,3, 2 )
                }
                putSprite( getImage( debri.sprt, debri ), wxy.x , wxy.y )             
            }
        }
        const flocks = State.flocks
        if (flocks){
            for ( let j = 0, ll = flocks.length ; j < ll ; j++ ){
                const flock = flocks[ j ]
                let { x, y, as } = flock
                let wxy = world_to_context( x, y )
                putSprite( getImage( flock.sprt, flock ), wxy.x , wxy.y )
            }
        }
        const oxs = State.oxs
        if (oxs){
            for ( let j = 0, ll = oxs.length ; j < ll ; j++ ){
                const ox = oxs[ j ]
                let { x, y, as } = ox
                let wxy = world_to_context( x, y )
                putSprite( getImage( ox.sprt, ox ), wxy.x , wxy.y )
            }
        }
        const balloons = State.balloons
        if (balloons){
            for ( let j = 0, ll = balloons.length ; j < ll ; j++ ){
                const balloon = balloons[ j ]
                let { x, y, as } = balloon
                let wxy = world_to_context( x, y )
                putSprite( getImage( balloon.sprt, balloon ), wxy.x , wxy.y )
            }
        }
        const bonuses = State.bonuses
        if ( bonuses ){
            for ( let j = 0, ll = bonuses.length ; j < ll ; j++ ){
                const bonus = bonuses[ j ]
                let { x, y, as } = bonus
                let wxy = world_to_context( x, y )
                putSprite( getImage( bonus.sprt, bonus ), wxy.x , wxy.y )
            }
        }
        const _boundingboxes = State._boundingboxes
        if (_boundingboxes && DEBUG_BOUNDING_BOXES ){
            _boundingboxes.forEach( ({x,y,w,h}) => {
                drawWorldRectangle( x, y, w, h, 'red' )
            })
        }
        const _lastcolls = State._lastcolls
        if (_lastcolls  && DEBUG_COLLISIONS ){
            _lastcolls.forEach( ( coll ) => {
                const { i1, id2, box1, box2 } = coll
                const [ x1_1, y1_1, x2_1, y2_1 ] = box1
                const [ x1_2, y1_2, x2_2, y2_2 ] = box2

                //
                const p1x = ( x1_1 + x2_1 ) / 2
                const p1y = ( y1_1 + y2_1 ) / 2
                const p2x = ( x1_2 + x2_2 ) / 2
                const p2y = ( y1_2 + y2_2 ) / 2
                let p1c = world_to_context( p1x, p1y )
                let p2c = world_to_context( p2x, p2y )
                $context.beginPath()
                $context.strokeStyle = 'blue'
                $context.moveTo( p1c.x, p1c.y )
                $context.lineTo( p2c.x, p2c.y )
                $context.stroke()
                $context.beginPath()
                $context.strokeStyle = 'blue'
                const margin = 2
                drawWorldRectangle( ( x1_1 + x2_1 ) / 2 ,
                                    ( y1_1 + y2_1 ) / 2 ,
                                    x2_1 - x1_1 - margin,
                                    y2_1 - y1_1 - margin,
                                    'orange' )
                drawWorldRectangle( ( x1_2 + x2_2 ) / 2 ,
                                    ( y1_2 + y2_2 ) / 2 ,
                                    x2_2 - x1_2 - margin,
                                    y2_2 - y1_2 - margin,
                                    'orange' )
                
            })
        }
    }
    function animate(){
        requestAnimationFrame( animate )
        display()
    }
    return {
        setState : state => State = state,
        display,
        animate,
    }
}
