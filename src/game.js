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

const IA_DOES_NOT_FIRE = false
const IA_JUST_FLIES_AROUND = false
const FIRST_PLANE_CANNOT_BE_DESTRUCTED = false
const MAX_PLANES = 10
const IDLE_IF_NO_PLAYER = true
const DEBUG_MESSAGES = true

export const DEBUG_COLLISIONS = true
export const DEBUG_BOUNDING_BOXES = true

//import { ground } from './ground.js'
import { symbFilterProps,  TARGETS_TYPE, DEBRIS_TYPE_COUNT } from './symbols.js'
// import { Tree, CONTINUE_VISIT, STOP_VISIT } from './coll.js'
import { clamp, posmod } from './utils.js'
//import { rectangle_intersection, rectangle_intersection_bool } from './rect.js'
import { ColorSchemes, SpriteTypeNum } from './symbols.js'
import { bonusessym12 } from './art/pixel12.js'
import { NameGenerator } from './misc/namegenerator.js'
import { ia } from './cipiu.js'
// import { default as boxIntersect } from 'box-intersect'
const seedrandom = require('seedrandom');

function debugMessage( ...p ){
    if ( DEBUG_MESSAGES ){
        console.log('[sopich game]',...p)
    }
}

export const worldSize = {
    x1 : 0,
    x2 : 1500,
    y1 : 0,
    y2 : 800,
    w : 1500,
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


//import { Island } from './object/island.js'
export function Game( { tellPlayer, // called with user centered world, each world update 
                        tellScore,  // called with player score, when quitting
                      } ) {
    const World = mkWorld()
    const { Components, Systems, Items, Events } = World
    const seed = "braoume"
    
    function dbgItems( printUndefined = false){
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
        // TODO
        // const removeMe = Events.pulse( 10, () => {
        //     console.log('*******************************')
        //     console.log('*******************************')
        //     console.log('*******************************')
        //     console.log('*******************************')
        //     console.log('*******************************')
        //     console.log( Components.heightmap.get( water ) )
        //     console.log( Components.position.get( water ) )
        //     console.log( Components.bb.get( water ) )
            
        // })
        
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
                heightmap : {
                    type : HEIGHTMAP_TYPE.island,
                    ...islandData
                },
                position : { x : 500, y : 0 },
                //speed : { pps : 1, min : 1, max : 5 },
                direction : { a16 : 3 },
                bb : {  },
                collision : { category : COLLISION_CATEGORY.island,
                              mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.island
                                                                | COLLISION_CATEGORY.water ) },
                attack : { collision : 1000 }
            })
            Events.onCollide( island1, (W,_, collideWithId ) => {
                // console.log('ISLAND COLLIDED')
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
            //        const island = Island( islandData )
            Items.create({
                //speed : { pps : 1, min : 1, max : 5 },
                direction : { a16 : 4 },
                heightmap : {
                    type : HEIGHTMAP_TYPE.island,
                    ...islandData
                },
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
    /*
    function createLandedBasket( { Items, Components, getVersion }, modelId ){
        const basket = Items.create( {
            sprite : Components.sprite.get( modelId ),
            position : Components.position.get( modelId ),
            color : Components.color.get( modelId ),
        })
        return basket
    }
    function createFallingBasket( { Items, Components }, modelId ){
        const basket = Items.create( {
            sprite : Components.sprite.get( modelId ),
            position : Components.position.get( modelId ),
            color : Components.color.get( modelId ),
            direction : { a16 : 12 },
            speed : { pps : 3, min : 0, max : 10 }
        })
        return basket
        }*/
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
            color : { cs : 2 },
            health : { life : 5, maxLife : 10 },
        })
        const balloon = Items.create( {
            sprite : { type : SpriteTypeNum['balloon'] },
            position : {},
            attachement : { attachedToId : basket,
                            location : RELATIVE_ATTACHEMENT_POSITION['above'],
                            radius : 16 },
            //animation : { timeoutId : timeoutAnim,
            //playlist : [0,1,2,3,4,5,6,7] },
            collision : { pixel : true,
                          category : COLLISION_CATEGORY.balloon,
                          mask : COLLISION_CATEGORY_ALL^(COLLISION_CATEGORY.balloon|COLLISION_CATEGORY.basket) },
            color : { cs : 2 },
            bb : {},
            health : { life : 5, maxLife : 10 },
        })

        Events.onCollide( basket, (W, id, withId ) => {
            // console.log('basket',id,'collides with',withId)
            // console.log('basket health :',Components.health.get( id ) )
            if ( Components.heightmap.has (withId) ){
                const speed = Components.speed.get( id )
                if ( speed ) {
                    //if ( speed.pps < 2 ){
                    //console.log('basket set unmovable')
                    Items.change( basket, { speed : false, bb : false, mass : false } )
                    //} 
                }
            }
        //     if ( Components.heightmap.has (withId) ){
            //         Components.health.get( id ).life--
            //     }
        })
        Events.onCollide( balloon, (W, id, withId ) => {
            //console.log('balloon',id,'collides with',withId)
        })

        function killBalloon( id ){
            const animTo = Items.create( { timeout : { start : World.getVersion(),  delay : 2,  repeatCount : 7 } } )
            Items.change( balloon, {
                attachement : false,
                fly : { freefall : true },
                mass : { mass: 10 },
                direction : { a16 : 12 },
                animation : { timeoutId : animTo,
                              playlist : [0,1,2,3,4,5,6,7] },
            } )
            const removeTo = Items.create( { timeout : { start : World.getVersion(),  delay : 16 } } )
            Events.wait( 16, () => Items.remove( balloon  ) )
        }
        Events.onDeath( basket, ( W, id ) => {
            //console.log('basket dies')
            const speed = Components.speed.get( id ) 
            if ( speed ){
                //console.log('set to free fall')
                Items.change( id, {
                    fly : { freefall : true },
                } )
                const direction = Components.direction.get( id )
                if ( direction ){
                    direction.a16 = 12
                }
            }
            killBalloon( id )
            Events.wait( 45, () => Items.remove( basket ) )
            Events.wait( 50, () => createFlyingBalloon( World ) )
        })
      
        Events.onDeath( balloon, ( W, id ) => {
            killBalloon( id )
            //console.log('ballon  dies')
            //Items.change( basket, { speed : false, bb : false, mass : false } )
            const speed = Components.speed.get( basket ) 
            if ( speed ){
                //console.log('set to free fall2')
                Items.change( basket, {
                    fly : { freefall : true },
                } )
            }
        })
            
    }
    function planeSkeletton( { Items }, source ){
        //console.log('skel source',source)
        const id =  Items.create( { 
            player : source.player,
            sprite : source.sprite,
            position : source.position,
            direction : source.direction,
            r : source.r,
            bb : {},
            color : source.color
        })
        return id
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
                health : { life : 1, maxlife : 1 },
                attack : { collision : 10 },
                direction : {}, // copy
                position : {}, // copy
                speed : {} // copy  pps : pps, max : 10, min : 0 },
            } }
        } )

    }
    function createPlacer( f, { w, h }, { x1, y1, x2, y2 } = worldSize ){        

        const radarId = Items.create( {
            placement : { x1, y1, x2, y2 },
            collision : {
                category : COLLISION_CATEGORY.radar,
                mask : COLLISION_CATEGORY_ALL ^ ( COLLISION_CATEGORY.radar )
            },
            position : { },
            bb : { w, h }
        })

        /*
        function watchUntil( condition, f, interval = 1 ){
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
        watchUntil(
            () => Systems.placer.isAvailable( radarId ),
            () => {
                const position = Components.position.get( radarId )
                if ( position === undefined ) return
                Items.remove( radarId )
                f( position )
            },
            10
        )*/
        
        const timeoutId = Events.pulse( 1, watchAvailable )
        function watchAvailable(){

            const isAvailable = Systems.placer.isAvailable( radarId )
            if ( isAvailable === false ) return
            
            const position = Components.position.get( radarId )
            if ( position === undefined ) return

            Items.remove( radarId )
            
            const timeout =  Components.timeout.get( timeoutId )
            if ( timeout === undefined ) return
            Items.remove( timeoutId )

            // call f
            f( position )
        }        
        
    }
    function createAndPlacePlayer( name, score, colorScheme ) {
        createPlacer( ( freePosition ) => {
            console.log('occupation', freePosition, 'isAvailable' )
            const id = createPlayer( name, score, colorScheme )
            const position = Components.position.get( id )
            if ( position ){
                console.log('set position',position)
                position.x = freePosition.x
                position.y = freePosition.y
                console.log('->set position',position)
            }
        }, { w : 128, h : 128 }, worldSize )
    }
    function createPlayer( name, score, colorScheme ){
                
        if ( colorScheme === undefined ){
            // get a constant random color scheme from name
            const rng = seedrandom( name )
            const num = Math.abs( rng.int32() ) % ColorSchemes.length
            colorScheme = num
        }
        let version = World.getVersion()
        const id1 = Items.create( {
            fly : { freefall : 0 },
            player : { name, score : 2 },
            position : { x : 200 + Math.random() * 800, y : 200 },
            direction : { a16 : 0 },
            propulsor : { power : 1, min : 0, max : 8 },
            speed : { pps : 0, max : 8, min : 0 },
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
            health : { life : 10, maxLife : 10 }
        } )
        
        // dir & speed & r
        const timeoutId1 = Items.create( {
            // removeWith : { ids:[id1] },
            timeout : { start : version,  delay : 1, resetable : true }
        })
        const actId1 = Items.create( {
            // removeWith : { ids:[id1] },
            actuator : { playerName : name, targetId : id1, timeoutId : timeoutId1 ,
                         commands : ['noseup','nosedown',
                                     'powerup','powerdown',
                                     'reverse'] }
        })
        
        
        // missile launchers
        for ( let i = 0 ; i < 3 ; i++){
            const launcherId1 = Items.create( {
                launcher : { modelId : Models.missile },
                removeWith : { ids:[id1] },
                attachement : { attachedToId : id1,
                                location : RELATIVE_ATTACHEMENT_POSITION['below'],
                                radius : 18 * ( 1 + i ) },
                position : {}, 
                direction : {},
            })
            const timeoutId3 = Items.create( {
                removeWith : { ids:[id1] },
                timeout : { start : version,  delay : 5,  resetable : true }
            })
            const actLauncherId1  = Items.create(  {
                removeWith : { ids:[id1] },
                actuator : { playerName : name,
                             targetId : launcherId1,
                             timeoutId : timeoutId3 ,
                             commands : ['firemissile'] }
            })
        }
        const radarId = attachRadar( id1, {
            //bb : { w : 64, h : 128 }
        })
        
        Events.onCollide( radarId, (W,_, collideWith ) => {
            //console.log('radar saw',collideWith)
        })
                                              
        
        Events.onDeath( id1, ( World, id ) => {
            const player = Components.player.get( id )
            // TODO propchange
            const toId = Items.create( { timeout : { start : World.getVersion(), delay  : 20,  } } )
            const skelId = planeSkeletton( World, {
                player : Components.player.get( id ),
                sprite : Components.sprite.get( id ),
                position : Components.position.get( id ),
                direction : Components.direction.get( id ),
                r : Components.r.get( id ),
                bb : {},
                color : Components.color.get( id )
            })
            Items.remove( id )

            const color = Components.color.get( id )
            
            Events.onTimeoutId( toId, W => {
                createPlayer( player.name, player.score )
                Items.remove( skelId )
            })
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
                          mask : COLLISION_CATEGORY_ALL ^ COLLISION_CATEGORY.bonus }
                          
        })
        const radar = attachRadar( bonus, {
            bb : { w : 200, h : 300 },
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
    let timeoutid
    createWater( World ) 
    createIslands( World ) 
    createFlyingBalloon( World )
    for ( let i = 0 ; i < 3000 ; i += 120 ){
        createMine( i, 200, 0 )
        createMine( i+50,300, 0 )
        createMine( i+100,400, 1 )
    }
    //createMine( 400,300, 0 )
    //createMine( 200,400, 1 )

    
    function update(){

        let version = World.getVersion()

        const timers = {}        
        timers.step = { start : Date.now() }
        World.step( )
        timers.step.end = Date.now()
        
        const took_ms = timers.step.end - timers.step.start 
        if ( took_ms > 20 ){
            console.log('version',version + 1,'took', took_ms,'ms', 'max steps per seconds:', 1000 /  took_ms )
        }
        //
        // function handleCollision12( id1, id2 ){
        //     //console.log('bon...',id1,id2)
        //     //console.log( Components.health.get(id1),Components.health.get(id2))
        //     if ( Components.player.has( id1 ) ){
        //         //console.log('bon...',id1,id2)
        //     }
        // }
        function handleDeath( id ){
            const Components = World.Components
            if (  Components.heightmap.has( id ) ){
            } else {
                const sprite = Components.sprite.get( id )
                if ( sprite ) {
                    if ( sprite.type === SpriteTypeNum['missile'] ){
                        Items.remove( id )
                    }
                }
                
            }
        }
        //
        World.Systems.collision.getCollidingPairs().forEach( ({ id1, id2 }) => {
            //console.log('record collision', id1, id2 )
            //handleCollision12( id1, id2 )
            //handleCollision12( id1, id2 )
        })        
        World.Systems.health.getDeathList().forEach( id => {
            //console.log('!!dead',id,Components.sprite.get(id).type,Components.player.get(id))
            handleDeath( id )
        })
        
        //Events.step()
       
        /*
          if ( ( version % 5 ) === 0 ){
          Systems.commands.handleInput( 'hie', [ 'noseup' ] ) 
          }
          if ( ( version % 6 ) === 0 ){
          Systems.commands.handleInput( 'bob', [ 'nosedown' ] ) 
          }
        */
        //dbgItems()
        
        sendUpdate()
    }
    function sendUpdate(){
        const categ = {
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
            _boundingboxes : [],
            _lastcolls : []
        }
        if ( !DEBUG_BOUNDING_BOXES ){
            delete categ._boudingboxes
        }
        if ( !DEBUG_COLLISIONS ){
            delete categ._lastcolls
        }
        
        //target_hit : [],
        
        let __idx = 0
        let __idx_b = 0
        let __idx_bk = 0

        if ( categ._lastcolls ){
            categ._lastcolls = Systems.collision.getCollidingPairs()
        }
        
        Items.forEach( (id,i) => {
            const sprite = Components.sprite.get( id ),
                  position = Components.position.get( id ),
                  direction = Components.direction.get( id ),
                  player = Components.player.get( id ) ,
                  r = Components.r.get( id ),
                  animation = Components.animation.get( id ),
                  heightmap = Components.heightmap.get( id ),
                  bb = Components.bb.get( id ),
                  color = Components.color.get( id )

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
                        cs : (color)?(color.cs):0,
                        as : ( animation && animation.step )?(animation.step):0,
                    })
                } else if  ( ( sprite.type === SpriteTypeNum['basket'] )  ) {
                    categ.balloons.push({
                        id,
                        x : position.x,
                        y : position.y, 
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,                        
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
                        x : position.x,
                        y : position.y,
                        ...symbFilterProps('dparams',{
                            cs : (color)?(color.cs):0,
                            a16 : direction.a16,
                            r : ((r)?(r.r):0),
                            sprt : sprite.type,
                        })
                    })
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
                    })
                } else  if ( ( sprite.type === SpriteTypeNum['bomb'] ) && direction  ) {
                    categ.bombs.push({
                        id : id,
                        a : direction.a8,
                        a8 : direction.a8,
                        x : position.x,
                        y : position.y,
                        sprt : sprite.type,
                        cs : (color)?(color.cs):0,
                    })
                } 
                
            }
        })
        const commonUpdate = Object.assign(
            categ, {
                t : Date.now(),
                version : World.getVersion(),
                justfired : [],
            }
        )
        Components.player.forEach( ([ playerId, player ]) => {
            const { name } = player
            const mePlaneIdx = categ.planes.findIndex( ( plane ) => plane.name === name )
            const me = { 'type' : 'planes' , idx:mePlaneIdx,  id : categ.planes[ mePlaneIdx ].id  }
            const update = Object.assign(
                commonUpdate,
                { me }
            )
            tellPlayer( name, update )
        })
    }

    
    function addPlayer( name, _, score ){
        createAndPlacePlayer( name, score )
        //createPlayer( name, score )
        dbgItems()
        return ADD_PLAYER_RETURNS.OK
    }
    function removePlayer( name ){
        console.log('please remove',name)
        Components.player.forEach( ([ playerId, player ]) => {
            console.log('is it',playerId, player)
            if ( name === player.name ){
                console.log( 'yes')
                Items.remove( playerId )
            }
        })
        setTimeout( function(){
            console.log('post mortem')
            dbgItems()
        },1000)
    }
    function getPlayers(){
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
        getPlayers,
        handleInput,
        handleAddEntity,
    }
}
/// pb is : controllers applys to layncher directio

