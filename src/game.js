// ia
// - masks
// game end/start
// scoring
// ox & targets
// - actuator launch missile outside
// teams
// - missiles outside
// - radar
// balloon/basket actuators
// - player placement
const IA_DOES_NOT_FIRE = false
const IA_JUST_FLIES_AROUND = false
const FIRST_PLANE_CANNOT_BE_DESTRUCTED = false
const MAX_PLANES = 10
const IDLE_IF_NO_PLAYER = true
const DEBUG_MESSAGES = true

export const DEBUG_COLLISIONS = false
export const DEBUG_BOUNDING_BOXES = false

//import { ground } from './ground.js'
import { symbFilterProps,  TARGETS_TYPE, DEBRIS_TYPE_COUNT } from './symbols.js'
// import { Tree, CONTINUE_VISIT, STOP_VISIT } from './coll.js'
import { clamp, posmod } from './utils.js'
//import { rectangle_intersection, rectangle_intersection_bool } from './rect.js'
import { ColorSchemes, SpriteTypeNum, SpriteInfosByTypeNum } from './symbols.js'
import { bonusessym12 } from './art/pixel12.js'
import { NameGenerator } from './misc/namegenerator.js'
import { ia } from './cipiu.js'
import { itemToSpriteData } from './world/systems.js'

// import { default as boxIntersect } from 'box-intersect'
const seedrandom = require('seedrandom');

function debugMessage( ...p ){
    if ( DEBUG_MESSAGES ){
        console.log('[sopich game]',...p)
    }
}

export const worldSize = {
    x1 : 0,
    x2 : 2500,
    y1 : 0,
    y2 : 800,
    w : 2500,
    h : 800
}
export const ADD_PLAYER_RETURNS = {
    OK : 0,
    WRONG_USERNAME : 1,
    ALREADY_JOINED : 2,
    USERNAME_TOO_LONG : 3,
    NO_MORE_AVAILABLE_ITEM : 4,
    USERNAME_ALREADY_IN_USE : 5
}
export const PLANE_INPUT_NAMES = [
    'noseup','nosedown','reverse',
    'powerup','powerdown',
    'firebomb','firemissile','fireguidedmissile',
]
/*
  const generateName = NameGenerator()
  const directions16 = new Array( 16 ).fill(0)
  .map( (_,i) => ( i * 2 * Math.PI / 16 ) )
  .map( x => [ Math.cos( x ), Math.sin( x ) ] )
  const directions8 = new Array( 8 ).fill(0)
  .map( (_,i) => ( i * 2 * Math.PI / 8 ) )
  .map( x => [ Math.cos( x ), Math.sin( x ) ] )
  const toFall8 = [7,0,6,4,5,6,6,6]
  const Hitmasks = prepareHitmask()
  const BottomHitmasks = prepareBottomHitmask()
  const Hitmaskfs = {
  plane : item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ],
  bomb : item => Hitmasks.bomb[ item.a ],
  missile : item => Hitmasks.missile[ item.a ],
  guidedmissile : item => Hitmasks.missile[ item.a ],
  flock : item => Hitmasks.flock[ item.as ],
  bird : item => Hitmasks.bird[ item.as ],
  target : item => ((item.broken)
  ?(Hitmasks.target_hit)
  :(Hitmasks.targets[ item.as ])),
  ox : item => Hitmasks.ox[ item.as ],
  debris : item => Hitmasks.ox[ 0 ], // TODO
  }
  const Bhitmaskfs = {
  plane : item => BottomHitmasks.plane[ (item.r)?1:0 ][ item.a ],
  bomb : item => BottomHitmasks.bomb[ item.a ],
  missile : item => BottomHitmasks.missile[ item.a ],
  guidedmissile : item => BottomHitmasks.missile[ item.a ],
  debris : item => BottomHitmasks.ox[ 0 ], // TODO
  }
*/
import { mkWorld } from './world/world.js'

export const COLLISION_CATEGORY = {
    'plane' : 1,
    'ox'    : 2,
    'flock' : 4,
    'debris' : 8,
    'missile' :16,
    'bomb' :32,
    'targets' : 64,
    'balloon' : 128,
    
    'basket' : 256,
    'target_hit' : 512,
    'island' : 1024,
    'radar' : 2048,
    'bonus' : 4096,
    'water' : 8192,
}
const COLLISION_CATEGORY_ALL  = Object.values( COLLISION_CATEGORY ).reduce( (r,x) => r | x, 0 )

import { RELATIVE_ATTACHEMENT_POSITION } from './world/systems.js'

export const HEIGHTMAP_TYPE = {
    'island' : 0,
    'water' : 1,
}
export const ATTACK_TYPE = {
    'collision' : 0,
}
const NOISE_TYPES = [ 'missile-fired', 'bomb-fired', 'death', 'damage' ]
export const NOISE_NUM_BY_NAME = NOISE_TYPES.reduce( (r,x,i) => {
    r[ x ] = i
    return r
}, {})
export const NOISE_NAME_BY_NUM = NOISE_TYPES.reduce( (r,x,i) => {
    r[ i ] = x
    return r
}, {})

import { OptionsParser } from './gameoptions.js'

const Definitions = {
    showTeamScore : { parser : 'parseBool', defaults : false },
    showPlayerScore: { parser : 'parseBool', defaults : false },
    stayOnGameOver: { parser : 'parseNatural', defaults : 70 },
    stayOnReset: { parser : 'parsePositiveNatural', defaults : 70 },
    maxTeamScore: { parser : 'parsePositiveNatural', defaults : 5 },
    minesCount: { parser : 'parseNatural', defaults : 0  },
    maxPlayers: { parser : 'parsePositiveNatural', defaults : 8  },
}
const optionsParser = OptionsParser( Definitions )
// console.log({
//     xx : optionsParser.parseOptions({
//         'showTeamScore' : true,
//         'showPlayerScore' : 64,
//         'stayOnGameOver' : 70,
//         'maxTeamScore' : 20,
//         'minesCount' : 99
//     })
// })
//import { Island } from './object/island.js'
import { Fsm } from './fsm.js'

export function Game( { tellPlayer, // called with user centered world, each world update 
                        tellScore,  // called with player score, when quitting
                      } ) {

    
    const World = mkWorld()
    const { Components, Systems, Items, Events } = World

    const seed = "braoume"
    
    const Options = optionsParser.parseOptions({
        showTeamScore : true,
        showPlayerScore : true,
        stayOnGameOver : 70,
        stayOnReset : 50,
        maxTeamScore : 5,
        minesCount : undefined,
        // maxPlayers : 1
    })
    const gameStateFsm = Fsm([
        { name : 'start', from : 'init', to : 'playing' },
        { name : 'pause', from : 'playing', to : 'paused' },
        { name : 'unpause', from : 'paused', to : 'playing' },
        { name : 'stop_paused', from : 'paused', to : 'end' },           
        { name : 'game_over', from : 'playing', to : 'game_over' },           
        { name : 'stop_game_over', from : 'game_over', to : 'end' },
        { name : 'replay1', from : 'game_over', to : 'reset' },
        { name : 'replay2', from : 'reset', to : 'playing' },
    ])
    const stateData = {
        waitTo : undefined
    }
    gameStateFsm.on.enter.playing = () => {
        console.log('now playing')
        // stateData.waitTo = Options.stayOnGameOver
    }
    gameStateFsm.on.enter.game_over = () => {
        stateData.waitTo = Options.stayOnGameOver
    }
    gameStateFsm.on.leave.game_over = () => {
        stateData.waitTo = undefined
    }
    gameStateFsm.on.enter.reset = () => {
        resetMatch()
        stateData.waitTo = Options.stayOnReset
    }
    
    const fsmi =  gameStateFsm.run( 'init' )

    function EventsWatchUntil( condition, f, interval = 1 ){
        const timeoutId = Events.pulse( interval, watchF )
        function watchF(){
            if ( condition( World ) ){
                const timeout =  Components.timeout.get( timeoutId )
                if ( timeout === undefined ) return
                Items.remove( timeoutId )
                f( World )
            }
        }
    }
    function mkRemoveAnim( id, playlist, frameDuration, extraDelay = 0 ){
        // play anim and remove
        const animationLength = playlist.length * frameDuration
        const animationTo = Items.create( {
            removeWith : { ids : [ id ] },
            timeout : { start : World.getVersion(),
                        delay : frameDuration ,
                        repeatCount : playlist.length - 1 }
        } )
        Items.change( id, {
            animation : { timeoutId : animationTo, playlist }
        })
        Events.wait( animationLength + extraDelay, () => {
            Items.remove( id )
        })
    }
    
    function dbgItems( printUndefined = false){
        return
        console.log('<=---', 'version', World.getVersion() )
        Items.forEach( id => {
            World.forEachComponent( ([ componentName, componentProps ]) => {
                const value = componentProps.get( id )
                if ( ( value !== undefined ) || printUndefined ){
                    console.log('item',id, componentName, JSON.stringify( value ) )
                }
            })
        })
        console.log('=--->')
    }
    function createDesignatedTimedActuator( targetId, delay, playerName, commands ){
        const timeoutId = Items.create( {
            removeWith : { ids:[ targetId ] },
            timeout : { start : World.getVersion(),  delay, resetable : true }
        })
        const actuatorId = Items.create( {
            removeWith : { ids:[ targetId ] },
            actuator : { playerName,
                         targetId,
                         timeoutId : timeoutId ,
                         commands }
        })
        return { timeoutId, actuatorId }
    }
    function createPlacer( { x1, y1, x2, y2 }, intervalle, onFreePosition, props ){        
        
        const radarId = Items.create( Object.assign({
            placement : { x1, y1, x2, y2 },
            collision : {
                category : COLLISION_CATEGORY.radar,
                mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.radar )
            },
            position : { },
        }, props ))

        
        EventsWatchUntil(
            () => Systems.placer.isAvailable( radarId ),
            () => {
                const position = Components.position.get( radarId )
                if ( position === undefined ) return
                Items.remove( radarId )
                onFreePosition( position )
            },
            intervalle
        )
        
    }
    function attachRadar( id1, options ){
        // radar
        const radarId = Items.create( Object.assign( {
            attachement : { attachedToId : id1, nospeed : true },
            removeWith : { ids:[id1] },
            collision : {
                category : COLLISION_CATEGORY.radar,
                mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.radar )
            },
            position : {},
            direction : {},
            bb : { w : 64, h : 64 } ,
        }, options ))
        return radarId
    }
    
    
    const Models = {
        test : Items.create( {} ),
        missile : Items.create( {
            model : {  model  : {
                sprite : { type :  SpriteTypeNum['missile'] },
                bb : {  },
                mass : { mass : 5 },
                collision : {
                    category : COLLISION_CATEGORY.missile,
                    mask : 0xffff
                },
                attack : { collision : 5 },
                speed : { pps : undefined, min : 14, max : 14 }, // copy  pps : pps, max : 10, min : 0 },
                worldbounds : { die : true },
                health : { life  : 1, maxLife : 1 },
                noise : { type : NOISE_NUM_BY_NAME[ 'missile-fired' ], volume : 1 },
                direction : {}, // copy
                position : {}, // copy
                color : {}, // copy,
            } }
        } ),
        bomb : Items.create( {
            model : {  model  : {
                fly : { freefall : true },
                sprite : { type :  SpriteTypeNum['bomb'] },
                bb : {  },
                mass : { mass : 5 },
                collision : {
                    category : COLLISION_CATEGORY.bomb,
                    mask : 0xffff
                },
                attack : { collision : 10 },
                direction : {}, // copy
                position : {}, // copy
                speed : { pps : undefined, min : 1, max : 4 }, // copy  pps : pps, max : 10, min : 0 },
                worldbounds : { die : true },
                noise : { type : NOISE_NUM_BY_NAME[ 'bomb-fired' ], volume : 1 },

                health : { life  : 1, maxLife : 1 },
                color : {} // copy
            } }
        } )

    }
    // function otherplayers(){
    //     const id1 = Items.create( {
    //         fly : { freefall : 1 },
    //         player : { name : 'bob', score : 15, cs : 1 },
    //         position : { x : 150, y : 450 },
    //         direction : { a16 : 0 },
    //         speed : { pps : 2, max : 5, min : 0 },
    //         mass : { mass : 1 },
    //         sprite : { type : SpriteTypeNum['plane'] },
    //         r : { r : 1 },
    //         bb : { },
    //         collision : { category : COLLISION_CATEGORY.plane,
    //                       mask : ( COLLISION_CATEGORY.plane | COLLISION_CATEGORY.flock )},
    //     })
    //     const actId1 = Items.create( {
    //         actuator : { playerName : 'bob', targetId : id1 }
    //     })
    //     const id2 = Items.create( {
    //         fly : { freefall : 1 },
    //         player : { name : 'hie', score : 15 , cs : 1},
    //         position : { x : 600, y : 600 },
    //         direction : { a16 : 0 },
    //         speed : { pps : 4, max : 4, min : 0 },
    //         sprite : { type : SpriteTypeNum['plane'] },
    //         bb : { },
    //         collision : { category : COLLISION_CATEGORY.plane,
    //                       mask : ( COLLISION_CATEGORY.plane | COLLISION_CATEGORY.flock )},
    //         mass : { mass : 2 },
    //     })
    //     const actId2 = Items.create( {
    //         actuator : { playerName : 'hie', targetId : id2 }
    //     })
    // }
    
    // const sharedTimeoutAnim = Items.create( {
    //     timeout : { start : 0,  delay : 2, loop : true }
    // })
    // function things(){
    //     {
    
    //         const id3 = Items.create( {
    //             sprite : { type : SpriteTypeNum['ox'] },
    //             position : { x : 557, y : 115 },
    //             collision : { category : COLLISION_CATEGORY.ox, mask : ( COLLISION_CATEGORY.plane )},
    //             animation : { timeoutId : sharedTimeoutAnim, playlist : [0,0,0,1,1,1,1] },
    
    //             bb : { },

    //             /*direction : { a16 : 0 },
    //               speed : { pps : 4, max : 4, min : 0 },*/
    //         })
    //     }
    //     const id4 = Items.create( {
    //         sprite : { type : SpriteTypeNum['flock'] },        
    //         position : { x : 456, y : 116 },
    //         collision : { category : COLLISION_CATEGORY.flock, mask : 0/*( COLLISION_CATEGORY.plane)*/, group : 666},
    //         bb : { },
    
    //     })
    
    //     for ( let i = 0 ; i < 30 ; i++ ){
    //         const id5 = Items.create( {
    //             sprite : { type : SpriteTypeNum['targets'],
    //                        subtypes : { tt : i%(Object.keys(TARGETS_TYPE).length) } },        
    //             position : { x : 500 + i * 32, y : 100 },
    //             collision : { category : COLLISION_CATEGORY.targets, mask : 0/*( COLLISION_CATEGORY.plane)*/, group : 666},
    //             animation : { timeoutId : sharedTimeoutAnim, playlist : [0,0,0,1,1,1,1] },
    //             bb : { },
    //             color : { cs : ( i % 9 ) },
    
    //         })
    //     }
    //     for ( let i = 0 ; i < 20 ; i++ ){
    //         const balloon = Items.create( {
    //             sprite : { type : SpriteTypeNum['balloon'] },
    //             position : { x : 500 + i * 32, y : 350 },
    //             collision : { category : COLLISION_CATEGORY.balloon, mask : 0/*( COLLISION_CATEGORY.plane)*/, group : 666},
    //             bb : {},
    //             mass : { mass : 0 + 10 * ( i / 100 ) },
    //             health : { life : 10, maxLife : 10 },
    //         })
    //         const basket = Items.create( {
    //             sprite : { type : SpriteTypeNum['basket'] },
    //             //            position : { x : 500 + i * 32, y : 200-16 },
    //             collision : { category : COLLISION_CATEGORY.basket, mask : 0/*( COLLISION_CATEGORY.plane)*/, group : 666},
    //             attachement : { attachedToId : balloon, location : RELATIVE_ATTACHEMENT_POSITION['below'],  radius : 16},
    //             position : {}, // { x : undefined , y : undefined }
    //             direction : {}, // { x : undefined , y : undefined }
    //             bb : {},
    //         })
    //     }

    
    //     for ( let i = 0 ; i < 30 ; i++ ){
    //         Items.create( {
    //             sprite : { type : SpriteTypeNum['debris'],
    //                        subtypes : { dt : i%DEBRIS_TYPE_COUNT } },        
    //             //position : { x : 100+Math.floor(Math.random()*800), y : 100+Math.floor(Math.random()*400) },
    //             position : { x : ( Math.random() * 500 ),  y : ( Math.random() * 500 ) } ,
    //             collision : { category : COLLISION_CATEGORY.debris,
    //                           mask : ( COLLISION_CATEGORY.debris |  COLLISION_CATEGORY.plane ) },
    //             bb : {  },
    //             direction : { a16 : 12 },
    //             speed : { pps : 1, max : 4, min : 0 },
    //             //health : { life : 100, maxlife : 100 }
    //             //mass : { mass : 1 },

    //         })
    //     }
    //     for ( let i = 0 ; i < 9 ;i++){
    //         const uu  = Items.create( {
    //             sprite : { type : SpriteTypeNum['target_hit'] },
    //             position : { x : 200 + i*32, y : 200 }
    //         })
    //     }
    // }
    function createTeam( name, total ){
        return Items.create({
            team : { name },            
            score : { total }
        })
    }
    function createWater( ){
        const waterlevel = 40
        const waterData = { w : worldSize.w, hmin : waterlevel, hmax : waterlevel  }
        const water = Items.create({
            heightmap : { type : HEIGHTMAP_TYPE.water, ...waterData },
            position : { x : 0, y : 0 },
            bb : { w : worldSize.w, h : waterlevel },
            collision : { category : COLLISION_CATEGORY.water,
                          mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.island
                                                            |  COLLISION_CATEGORY.water ) },
            attack : { collision : 1000 }
        })

        
    }
    function createIslands( { Items }){
        {
            const islandData = {
                w:500,
                seed:'belleile'+Math.random(),
                hmin:100,
                hmax:200,
                period:50
            }
            //        const island = Island( islandData )        
            const island1 = Items.create({
                heightmap : { type : HEIGHTMAP_TYPE.island, ...islandData },
                position : { x : 500, y : 0 },
                //speed : { pps : 1, min : 1, max : 5 },
                direction : { a16 : 3 },
                bb : {  },
                collision : { category : COLLISION_CATEGORY.island,
                              mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.island
                                                                | COLLISION_CATEGORY.water ) },
                attack : { collision : 1000 }
            })
        }
        {
            const islandData = {
                w:500,
                seed:'belleile'+Math.random(),
                hmin:50,
                hmax:200,
                period:50
            }
            Items.create({
                direction : { a16 : 4 },
                heightmap : { type : HEIGHTMAP_TYPE.island, ...islandData },
                position : { x : 1500, y : 0 },
                bb : {  },
                collision : {
                    category :COLLISION_CATEGORY.island,
                    mask : COLLISION_CATEGORY_ALL ^ COLLISION_CATEGORY.island,
                    pixel : true,
                },
                attack : { collision : 1000 }
            })
        }
    }
    

    function createFlyingBalloon( { Items, Components, getVersion } )  {

        const timeoutAnim = Items.create( {
            timeout : { start : 0,  delay : 1, /* repeatCount : 8, */  loop : true }
        })
        
        const basket = Items.create( {
            sprite : { type : SpriteTypeNum['basket'] },
            position : { x : 200 + (800 * Math.random()), y : 400 },
            mass : { mass: 10 },
            animation : { timeoutId : timeoutAnim,
                          playlist : [0,0,0,0,3,3,1,1,1,1,3,3,3,0,0,0,0,0,0,3,2,2,2,2,3,3] },
            collision : { pixel : true,
                          category : COLLISION_CATEGORY.basket,
                          mask : COLLISION_CATEGORY_ALL^(COLLISION_CATEGORY.basket|COLLISION_CATEGORY.balloon) },
            bb : {},
            direction : { a16 : 12 }, // { x : undefined , y : undefined }
            speed : { pps : 1, min : 0, max : 3 },
            color : { cs : 3 },
            health : { life : 5, maxLife : 10 },
            attack : { collision : 2 },

        })
        const balloon = Items.create( {
            sprite : { type : SpriteTypeNum['balloon'] },
            position : {},
            attachement : { attachedToId : basket,
                            location : RELATIVE_ATTACHEMENT_POSITION['above'],
                            radius : 16 },
            collision : { pixel : true,
                          category : COLLISION_CATEGORY.balloon,
                          mask : COLLISION_CATEGORY_ALL^(COLLISION_CATEGORY.balloon|COLLISION_CATEGORY.basket) },
            color : { },
            bb : {},
            health : { life : 5, maxLife : 10 },
            attack : { collision : 1 },
        })

        function groundBasket( ){
            const speed = Components.speed.get( basket )
            if ( speed ) {
                Items.change( basket, { speed : false, bb : false, mass : false } )
            }
        }
        function killBalloon(  ){
            mkRemoveAnim( balloon, [0,1,2,3,4,5,6,7], 1, 0 )
        }
        function killBasketAndRespawn(){
            killBalloon( balloon )
            Events.wait( 10 * 10, () => Items.remove( basket ) )
            Events.wait( 15 * 10, () => createFlyingBalloon( World ) )
        }
        function freeFlyBasket(  ){
            Items.change( basket, { fly : { freefall : true } } )
            const direction = Components.direction.get( basket )
            if ( direction ){
                // head to ground
                direction.a16 = 12
            }
        }
        Events.onCollide( basket, (_, __, withId ) => {
            if ( Components.heightmap.has( withId ) ){
                // console.log('* basket collides with ground')
                // collide with ground
                groundBasket()
            }
        })
        Events.onDeath( basket, ( W, id ) => {
            const speed = Components.speed.get( id )
            // console.log('* basket is dead')
            if ( speed ){
                // is not crashed
                freeFlyBasket()
            }
            killBasketAndRespawn()
        })
        Events.onDeath( balloon, ( W, id ) => {
            // console.log('* balloon is dead')
            killBalloon( id )
            const speed = Components.speed.get( basket ) 
            if ( speed ){
                // in in air
                Items.change( basket, { fly : { freefall : true } } )
            }
        })
        
    }
    // function planeSkeletton( { Items }, source ){
    //     //console.log('skel source',source)
    //     const id =  Items.create( { 
    //         player : source.player,
    //         sprite : source.sprite,
    //         position : source.position,
    //         direction : source.direction,
    //         r : source.r,
    //         bb : {},
    //         color : source.color
    //     })
    //     return id
    // }
    function createAndPlacePlayer( { name, totalScore, colorScheme, teamId } ) {

        const found = firstPlayerByName( name )
        if ( found )
            return
        
        createPlacer( worldSize, 1, ( freePosition ) => {
            // console.log('occupation', freePosition, 'isAvailable' )
            const id = createPlayer( { name, totalScore, colorScheme, teamId } )
            const position = Components.position.get( id )
            if ( position ){
                position.x = freePosition.x
                position.y = freePosition.y
            }
        }, {
            bb : { w : 256, h : 256 },
            player : { name },
            member : { teamId },
        })
    }
    function createPlayer( { name, totalScore, colorScheme, teamId } ){
        
        if ( colorScheme === undefined ){
            // get a constant random color scheme from name
            const rng = seedrandom( name )
            const num = Math.abs( rng.int32() ) % ColorSchemes.length
            colorScheme = num
        }
        let version = World.getVersion()
        const id1 = Items.create( {            
            fly : { freefall : 0 },
            player : { name },
            score : { total : totalScore },
            member : { teamId },
            position : { x : 200 + Math.random() * 800, y : 200 },
            direction : { a16 : 0 },
            propulsor : { power : 10, min : 0, max : 10 },
            speed : { pps : 0, max : 10, min : 5 },
            sprite : { type : SpriteTypeNum['plane'] },
            r : { r : 0 },
            bb : {  },
            collision : { category : COLLISION_CATEGORY.plane,
                          mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.flock ),
                          //group : 666,
                          pixel : true,
                        },
            mass : { mass : 1 },
            color : { cs : colorScheme },
            attack : { collision : 10 },
            health : { life : 10, maxLife : 10 },
            worldbounds : { /*nobounce : true*/ },

        } )
        
        const speedAndDirTimedActuator = createDesignatedTimedActuator(
            id1, 1, name, ['noseup','nosedown', 'powerup','powerdown', 'reverse' ]
        )
        
        // missile launchers
        for ( let i = 0 ; i < 1 ; i++){
            const launcherId = Items.create( {
                launcher : { modelId : Models.missile },
                removeWith : { ids:[id1] },
                attachement : { attachedToId : id1,
                                location : RELATIVE_ATTACHEMENT_POSITION['below'],
                                radius : 18 * ( 1 + i ) },
                position : {}, 
                direction : {},
                speed : {},
                color : {},
                owned : { ownerId : id1 },
            })
            const fireMissileTimedActuator = createDesignatedTimedActuator(
                launcherId, 8, name, ['firemissile']
            )
        }
        
        // bomb launcher
        {
            const launchDelay = 5
            const launcherId = Items.create( {
                launcher : { modelId : Models.bomb },
                removeWith : { ids:[id1] },
                attachement : { attachedToId : id1,
                                location : RELATIVE_ATTACHEMENT_POSITION['below'],
                                radius : 18 * ( 1 ) },
                position : {}, 
                direction : {},
                speed : {},
                color : {},
                owned : { ownerId : id1 },
            })
            Events.pulse( 1, () => {
                const speed = World.Components.speed.get( launcherId )
                //console.log('speeeeeeed',speed)
            })
            const fireBombTimedActuator = createDesignatedTimedActuator(
                launcherId, launchDelay, name, ['firebomb']
            )
            
        }
        function dieAndRespawn( id ){
            const toId = Items.create(
                { timeout : { start : World.getVersion(), delay  : 60  }}
            )
            const player = Components.player.get( id )
            const member = Components.member.get( id )
            const score = Components.score.get( id )
            const color = Components.color.get( id )
            // console.log('dead',{ player, member, color })
            Events.onTimeoutId( toId, W => {
                if ( Components.player.has( id ) ){
                    Items.remove( id )
                    createAndPlacePlayer( { name : player.name,
                                            totalScore : score.total,
                                            teamId : member.teamId
                                          })
                }
            })
            
        }
        function removeSpeedAndDirActuators(){
            Items.remove( speedAndDirTimedActuator.actuatorId )
            Items.remove( speedAndDirTimedActuator.timerId )            
        }
        function freeze(){
            Items.change( id1, { propulsor : false,
                                 mass : false,
                                 speed : false } )
        }
        function removePropulsion(){
            Items.change( id1, { propulsor : false } )
        }
        let crashed = false
        let deadInAir = false
        Events.onCollide( id1, (W,_, collideWith ) => {
            if ( Components.heightmap.has( collideWith ) ){
                if ( crashed === false ){
                    // first occurence of crashed
                    crashed = true
                    freeze()
                    removeSpeedAndDirActuators()
                    if  ( deadInAir ){
                        // crash happens after a death in air
                        dieAndRespawn( id1 )
                    }
                }
            }
        })
        Events.onKill( id1, ( World, _, killed ) => {
            const player1 = Components.player.get( id1 )
            killed.forEach( (_,id ) => {
                const player2 = Components.player.get( id )
                if ( player1 && player2 ){
                    const member1 = Components.member.get( id1 )
                    const member2 = Components.member.get( id )
                    let credit = 0
                    if ( member1 && member2 ){
                        const teamId1 = member1.teamId
                        const teamId2 = member2.teamId
                        if ( teamId1 === teamId2 ){
                            credit = -2
                        } else {
                            credit = 1
                        }
                        Systems.score.credit( id1, credit )
                    } else {
                        Systems.score.credit( id1, 1 )
                    }
                }
            })
        })
        Events.onDeath( id1, ( World, id ) => {
            // console.log('* player is dead')

            if ( crashed ) {
                // dead after a crash
                dieAndRespawn( id1 )
            } else {
                // wait for the crash to remove player
                deadInAir = true
                removePropulsion()
                removeSpeedAndDirActuators()
            }
        })
        return id1
    }    
    function createMine( x, y, bt  ) {
        const animTo = Items.create( { timeout : { start : World.getVersion(),  delay : 1,  loop : true } } )
        const subtypeLength = bonusessym12.length
        const bonus = Items.create( {
            sprite : { type : SpriteTypeNum['bonuses'], subtypes : { bt : bt % subtypeLength } },
            position : { x, y },
            animation : { timeoutId : animTo /*, playlist : [0,0,0,0,3,3,1,1,1,1,3,3] */ },
            color : { cs : 0 },
            bb : {},
            collision : { category : COLLISION_CATEGORY.bonus,
                          mask : COLLISION_CATEGORY_ALL ^ COLLISION_CATEGORY.bonus },
            attack : { collision : 1 }
            
        })
        const radar = attachRadar( bonus, {
            bb : { w : 64, h : 64 },
            collision : { category : COLLISION_CATEGORY.radar,
                          mask : COLLISION_CATEGORY.plane }
        } )
        function goTo( bonusPosition, target ){
            
            const r = 0.9, // sloppy
                  dx = bonusPosition.x - target.x,
                  dy = bonusPosition.y - target.y
            //const pr = ( ( dx + dy ) > 50 )?r:(r/2)
            bonusPosition.x = ( r * dx ) + target.x
            bonusPosition.y = ( r * dy ) + target.y
            
        }
        function mDistanceToHome( bonusPosition ){
            return Math.abs( bonusPosition.x - x ) + Math.abs( bonusPosition.y - y )

        }
        // TODO 
        const removeMeId = Events.pulse( 10, () => {

            const bonusPosition  = Components.position.get( bonus )

            if ( bonusPosition === undefined )
                return

            goTo( bonusPosition, {x,y} )
            
        })
        Events.onCollide( radar, (_,__,other) => {

            const otherPlayer = Components.player.get( other )

            if ( otherPlayer === undefined )
                return

            const otherPosition  = Components.position.get( other )
            if ( otherPosition === undefined )
                return

            const bonusPosition  = Components.position.get( bonus )
            if ( bonusPosition === undefined )
                return

            const distToHome = mDistanceToHome( bonusPosition )
            
            let target
            if ( distToHome > 200 ){
                target = { x, y }
            } else {
                target = otherPosition
            }
            goTo( bonusPosition, target )

        })
    }
    function iii(){
        let timeoutid
        createTeam('red',0)
        createTeam('blue',0)
        createWater( World ) 
        createIslands( World ) 
        createFlyingBalloon( World )
        if ( Options.minesCount ){
            new Array( Options.minesCount ).fill(0).map( () => {
                const x = worldSize.x1 + Math.random() * worldSize.w
                const y = worldSize.y1 + Math.random() * worldSize.h
                createMine( x, y, 0 )
            })
        }
    }
    iii()
    //createMine( 400,300, 0 )
    //createMine( 200,400, 1 )

    function resetMatch(){
            const { Systems, Components, Items } = World
            const playerInfos = []
            Components.player.forEach( ([id,player]) => {
                const member = Components.member.get( id )
                // const color = Components.color.get( id )
                playerInfos.push( { player, member /*, color */ } )
                Items.remove( id )
                console.log('-player', id, { player, member /*, color */ } )
            })
            
            playerInfos.forEach( ({ player, member, color }) => {
                const { name } = player
                const { teamId } = member
                //const { cs } = color
                createAndPlacePlayer( { name, teamId, /* colorScheme : cs,*/ totalScore : 0, } )
                console.log('+player', { player, member, color } )
            })
            
            Systems.team.forEach( ( team, id ) => {
                const score = Components.score.get( id )
                if ( score ){
                    score.total = 0
                    console.log('reset score')
                }
                console.log('-team', id, { team }, Components.score.get( id ) )
            })

            
           
        
    }
    function update(){
        const state = fsmi.getState()
        if ( state === 'init' ){
            fsmi.send.start()
        } else if ( state === 'game_over' ){
            if ( stateData.waitTo <= 0 ){
                fsmi.send.replay1()
            } else {
                stateData.waitTo--
            }
        } else if ( state === 'reset' ){
            if ( stateData.waitTo <= 0 ){
                fsmi.send.replay2()
            } else {
                stateData.waitTo--
            }
        } else if ( state === 'playing' ){
            let version = World.getVersion()
            
            const timers = {}        
            timers.step = { start : Date.now() }
            World.step( )
            timers.step.end = Date.now()
            
            const took_ms = timers.step.end - timers.step.start 
            if ( took_ms > 20 ){
                console.log('version',version + 1,'took', took_ms,'ms', 'max steps per seconds:', 1000 /  took_ms )
            }

            function handleDeath( id ){
                // console.log( 'handleDeath',id)
                const Components = World.Components
                if (  Components.heightmap.has( id ) ){
                } else {
                    const sprite = Components.sprite.get( id )
                    if ( sprite ){
                        if (( sprite.type === SpriteTypeNum['missile'] )
                            || ( sprite.type === SpriteTypeNum['bomb'] ) )
                            Items.remove( id )
                    }
                }
            }
            //
            World.Systems.collision.getCollidingPairs().forEach( ({ id1, id2 }) => {           
            })        
            World.Systems.health.getDeathList().forEach( (_,id) => {
                handleDeath( id )
            })
            
            function maximumScoreExitCondition( World ){
                World.Components.score.forEach( ([scoreId,score]) => {
                    const { total } = score
                    if ( total >= Options.maxTeamScore ){
                        fsmi.send.game_over()//gameState.send('max-score-reached')
                    }
                })
            }
            const exitCondition = maximumScoreExitCondition( World )
            if ( exitCondition ){
                
            }
        }
        //dbgItems()
        
        sendUpdate()
    }
    const leaderBoardInterval = 10
    let leaderBoardTo = 0
    function sendUpdate(){
        const categ = {
            placers : [],
            planes : [],
            balloons : [],
            oxs : [],
            targets : [],
            missiles : [],
            bombs : [],
            flocks : [],
            debris : [],
            heightmaps : [],
            bonuses : [],
            sprites : [],
            _boundingboxes : [],
            _lastcolls : [],
            /*_dbg_snd : [{
                id : 'bidon_0',
                x : 10,
                y : 10,
                noise : {
                    type : NOISE_NUM_BY_NAME['bomb-fired'],
                    volume : 1
                },
            },{
                id : 'bidon_1', x : 10, y : 10,
                noise : {
                    type : NOISE_NUM_BY_NAME['missile-fired'],
                    volume : 1
                },
            }]*/
        }
        if ( !DEBUG_BOUNDING_BOXES ){
            delete categ._boundingboxes
        }
        if ( !DEBUG_COLLISIONS ){
            delete categ._lastcolls
        }

        const mkLeaderboard = ( (leaderBoardTo++) % leaderBoardInterval ) === 0 
        const leaderboard = []
        if ( mkLeaderboard ){

            Components.score.forEach( ([id,score]) => {
                const player = Components.player.get( id )
                if ( ( player !== undefined ) && Options.showPlayerScore ){
                    let displayName = player.name
                    const member = Components.member.get( id )
                    if ( member ){
                        const { teamId } = member
                        if ( teamId !== undefined ){
                            const team = Components.team.get( teamId )
                            if ( team !== undefined ){
                                displayName = `[${ team.name }] ${ player.name }`
                            }
                        }
                    }
                    leaderboard.push( { username : displayName,
                                        score : score.total } )
                }
                const team  = Components.team.get( id )
                if (( team !== undefined ) && Options.showTeamScore ){
                    const displayName = `${ team.name }`
                    leaderboard.push( { username : displayName,
                                        isTeam : true,
                                        score : score.total } )
                }
            })
        }
        //target_hit : [],
        
        let __idx = 0
        let __idx_b = 0
        let __idx_bk = 0

        if ( categ._lastcolls ){
            categ._lastcolls = Systems.collision.getCollidingPairs()
        }
        const idByName = new Map()
        Items.forEach( (id,i) => {
            const sprite = Components.sprite.get( id ),
                  position = Components.position.get( id ),
                  direction = Components.direction.get( id ),
                  player = Components.player.get( id ) ,
                  r = Components.r.get( id ),
                  animation = Components.animation.get( id ),
                  heightmap = Components.heightmap.get( id ),
                  bb = Components.bb.get( id ),
                  color = Components.color.get( id ),
                  placement = Components.placement.get( id ),
                  health = Components.health.get( id ),
                  didTakeDamage = Systems.health.didTakeDamage( id ),
                  member = Components.member.get( id ),
                  noise = Components.noise.get( id )
                  
            let teamName = undefined,
                teamColorScheme = undefined

            if ( member ) {
                const { teamId } = member
                if ( teamId !== undefined ){
                    const team = Components.team.get( teamId )
                    if ( team ){
                        teamName = team.name
                    }
                    const color = Components.color.get( teamId )
                    if ( color ){
                        teamColorScheme = color.cs
                    }
                }
            }
            
            if ( placement !== undefined ){
                categ.placers.push({
                    id,
                    x : position.x,
                    y : position.y,
                })
            }

            if ( player !== undefined ){
                idByName.set( player.name, id )
            }
            
            if ( categ._boundingboxes ){
                if ( bb && position ){
                    categ._boundingboxes.push( {
                        ...position,
                        ...bb
                    })
                }
            }
            if ( heightmap && position ){
                categ.heightmaps.push({
                    id,
                    x : position.x,
                    y : position.y,
                    ... heightmap ,
                })
            }

            // if ( sprite && position ){
            
            //     const sprdata = itemToSpriteData( World, id )
            //     sprdata.sprt = sprite.type
            //     //console.log('sprdata',sprdata)

            //     const dprops = symbFilterProps( 'dparams', sprdata )
            //     //console.log('dprops',dprops)
            //     // const dparams = SpriteInfosByTypeNum[ sprite.type ]['dparams']
            //     // if ( dparams === undefined )
            //     //     throw new Error('NO!')

            //     // const p = dparams.reduce( 
            
            //     // const dataKeys = Object.keys( sprdata )
            //     // for ( let i = 0 ; i < dataKeys.length ; i++ ){
            //     //     const k = dataKeys[ i ]
            //     //     if ( infos
            //     // }

            //     const obj = {
            //         id,
            //         x : position.x,
            //         y : position.y,
            //         ...dprops
            //     }
            //     categ.sprites.push(  obj )
            //     //console.log(JSON.stringify( obj ) )
            
            
            // }
            
            if ( sprite && position ) {
                if  ( ( sprite.type === SpriteTypeNum['bonuses'] )  ) {
                    categ.bonuses.push({
                        id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        as : ( animation && animation.step )?(animation.step):0,
                        cs : (color)?(color.cs):0,
                        bt : (sprite.subtypes)?(sprite.subtypes.bt):0
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['balloon'] )  ) {
                    categ.balloons.push({
                        id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs || 0):0,
                        as : ( animation && animation.step )?(animation.step):0,
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['basket'] )  ) {
                    categ.balloons.push({
                        id,
                        x : position.x,
                        y : position.y, 
                        sprt : sprite.type,
                        cs : (color)?(color.cs || 0):0,                        
                        as : ( animation && animation.step )?(animation.step):0,
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['ox'] )  ) {
                    categ.oxs.push({
                        id,
                        x : position.x,
                        y : position.y, 
                        sprt : sprite.type,
                        as : ( animation && animation.step )?(animation.step):0,
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['flock'] )  ) {
                    categ.flocks.push({
                        id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['targets'] )  ) {
                    categ.targets.push({
                        id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,
                        //type : i%(Object.keys(TARGETS_TYPE).length),// ( animation && animation.step )?(animation.step):0,
                        tt : (sprite.subtypes)?(sprite.subtypes.tt):0
                    })
                    __idx++
                } else if  ( ( sprite.type === SpriteTypeNum['target_hit'] )  ) {
                    categ.targets.push({
                        id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,
                    })
                    __idx++
                } else  if ( ( sprite.type === SpriteTypeNum['plane'] ) && direction && player ) {
                    
                    categ.planes.push({
                        id,
                        name : player.name,
                        teamName,
                        teamColorScheme,
                        x : position.x,
                        y : position.y,
                        ...symbFilterProps('dparams',{
                            cs : (color)?(color.cs):0,
                            a16 : direction.a16,
                            r : ((r)?(r.r):0),
                            sprt : sprite.type,
                        }),
                    })
                    if ( health ){
                        categ.planes[ categ.planes.length - 1].lf = health.life
                    }
                    if ( didTakeDamage ){
                        categ.planes[ categ.planes.length - 1].dmg = 1
                    }

                    /*
                      categ.planes.push({
                      id : id,
                      name : player.name,
                      x : position.x,
                      y : position.y,
                      sprt : sprite.type,
                      cs : (color)?(color.cs):0,
                      a16 : direction.a16,
                      r : ((r)?(r.r):0),
                      })
                    */
                }  else  if ( ( sprite.type === SpriteTypeNum['debris'] )  ) {
                    categ.debris.push({
                        id : id,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,
                        dt : (sprite.subtypes)?(sprite.subtypes.dt):0,
                    })
                }  else  if ( ( sprite.type === SpriteTypeNum['missile'] ) && direction  ) {
                    categ.missiles.push({
                        id : id,
                        a16 : direction.a16,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,
                        noise,
                    })
                } else  if ( ( sprite.type === SpriteTypeNum['bomb'] ) && direction  ) {
                    
                    let a16 = 0
                    if ( a16 !== undefined ){
                        a16 = direction.a16
                    } else if ( a8 !== undefined ){
                        a16 = a8 * 2 
                    }
                    categ.bombs.push({
                        id : id,
                        //a16 : direction.a8 * 2,
                        a8 : Math.floor(a16/2),
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,    noise,
                    })
                }
            }
            
            
        })
        const commonUpdate = Object.assign(
            categ, {
                t : Date.now(),
                version : World.getVersion(),
                justfired : [],
                s : fsmi.getState(),
            }
        )
        if ( mkLeaderboard ){
            commonUpdate.leaderboard = leaderboard
        }
        Components.player.forEach( ([ playerId, player ]) => {
            const { name } = player
            //const mePlaneIdx = categ.planes.findIndex( ( plane ) => plane.name === name )
            //const me = { id : categ.planes[ mePlaneIdx ].id  }
            const me = { id : idByName.get( name ) }
            const update = Object.assign(
                commonUpdate,
                { me }
            )
            tellPlayer( name, update )
        })
    }

    function firstPlayerByName( name ){
        for ( const [id,player] of Components.player.entries() ){
            if ( player.name === name ){                
                return id
            }
        }        
    }
    function addPlayer( name, _, totalScore ){
        console.log('Addplayer', {name,_,totalScore})
        
        const found = firstPlayerByName( name )
        if ( found !== undefined ){
            console.log('ALREADY EXISTS',name)
            return ADD_PLAYER_RETURNS.ALREADY_JOINED
        }
        
        const playerCount = getPlayers().length
        if ( playerCount >= Options.maxPlayers ){
            console.log('GAME FULL',name)
            return ADD_PLAYER_RETURNS.NO_MORE_AVAILABLE_ITEM            
        }
             
        let teamId = undefined
        {            
            const smallest = { size : undefined, id : undefined }
            Systems.team.forEach( (team,teamId) => {
                const teamSize = Systems.team.getTeamMembers( teamId ).size
                if ( ( smallest.size === undefined )
                     || ( teamSize < smallest.size ) ){
                    smallest.size = teamSize
                    smallest.id = teamId
                }
            })
            console.log( 'smallest team', smallest )
            teamId = smallest.id
        }
        const isPlacer = found && Components.placement.has( found )
        console.log({isPlacer})
        
        
            createAndPlacePlayer( { name, totalScore : 0, teamId } )
            //createPlayer( name, score )
            // dbgItems()
            return ADD_PLAYER_RETURNS.OK
        
    }
    function removePlayer( name ){
        console.log('please remove',name)
        const found = firstPlayerByName( name )
        if ( found ){
            console.log('finished for',name,found)
            Items.remove( found )
        }       
    }
    function getPlayers(){
        const names = []
        Components.player.forEach( ([id,player]) => {
            if ( player.name ){
                names.push( player.name )
            }
        })
        return names
    }    
    function handleInput( name, input ){
        // console.log( '[game][input]', Date(), name, JSON.stringify( input ))
        Systems.commands.handleInput( name, input )
    }
    const FPS = 10
    function gameloop(){
        setInterval( update, 1000/FPS )
    }
    gameloop()
    function handleAddEntity( model ){
        console.log( 'user asks for entity creation', model )
        const item = Items.create( model )
        console.log( 'created item', item )
    }
    return {
        addPlayer,
        removePlayer,
        handleInput,
        handleAddEntity,
        getPlayers,
        getOptions : () => Options
    }
}
/// pb is : controllers applys to layncher directio

