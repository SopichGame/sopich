/*
 * Systems
 */
import { clamp, posmod } from '../utils.js'
const directions16 = new Array( 16 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 16 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )
const directions8 = new Array( 8 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 8 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )
import { default as boxIntersect } from 'box-intersect'
import {  worldSize, HEIGHTMAP_TYPE } from '../game.js'
const toFall8 = [7,0,6,4, 5,6,6,6]
const toFall16 = [15,0,1,2, 5,6,7,8, 9,10,11,12, 12,12,13,14]
export const RELATIVE_ATTACHEMENT_POSITION = {
    'ahead' : 0,
    'above' : 1,
    'behind': 3,
    'below' : 4
}
import { Island } from '../object/island.js'
import { Water } from '../object/water.js'

function normalDirection16(r,a){
    return ( a + (r?4:12) ) % directions16.length
}
export function itemToSpriteData( { Components }, id ){
    const bb = Components.bb.get( id )
    const sprite = Components.sprite.get(id)
    if ( sprite === undefined )
        return
    
    const animation = Components.animation.get(id)
    // cs r a as dtype
    const direction = Components.direction.get(id)
    const r = Components.r.get(id)
    // as
    // dtype
    const sprType = sprite.type
    //const { w, h } = SpriteInfosByTypeNum[ sprType ]
    const subtypes = sprite.subtypes
    let a16 = 0
    if ( direction ){
        if ( direction.a16 !== undefined ) {
            a16 = direction.a16
        } else if ( direction.a8 !== undefined ) {
            a16 = direction.a8 * 2
        }
    }                        
    const sprData = {
        r : r?r.r:0,
        a16 : a16, 
        a8 : Math.floor( a16 / 2 ),
        as : (animation?(animation.step):0),
        tt : ((subtypes)?(subtypes.tt):0),
        bt : ((subtypes)?(subtypes.bt):0),
        dt : ((subtypes)?(subtypes.dt):0),
    }
    
    return sprData
}

import { prepareBottomHitmask, symbGetInArray,
         prepareHitmask, prepareDimensions }  from '../symbols.js'
import { SpriteInfosByTypeNum, ColorSchemes,
         SpriteTypeNum } from '../symbols.js'

const BottomHitMasks = prepareBottomHitmask()
const getBottomHitMask = symbGetInArray( BottomHitMasks, 'bmparams' )

const SpriteDimensions = prepareDimensions()
const getSpriteDimensions = symbGetInArray( SpriteDimensions, 'dimparams' )

const HitMasks = prepareHitmask()
const getHitMask = symbGetInArray( HitMasks, 'mparams' )

export function getRelativeAttachementPosition( { a8 = 0, a16 = a8 * 2 } = {},
                                                { r = 0 } = {}, radius  = 0, location = 0){
    
    if ( location === RELATIVE_ATTACHEMENT_POSITION['below'] ){
    } else if ( location === RELATIVE_ATTACHEMENT_POSITION['above'] ){
        a16 = ( a16 + 8 ) % 16
    } else if ( location === RELATIVE_ATTACHEMENT_POSITION['behind'] ){
        a16 = ( a16 + 12 ) % 16
    } else if ( location === RELATIVE_ATTACHEMENT_POSITION['ahead'] ){
        a16 = ( a16 + 4 ) % 16
    }
    
    let normal = normalDirection16(r, a16 || 0 )
    let dir = directions16[ normal % 16 ]
    return {
        x : dir[0] * radius,
        y : dir[1] * radius
    }
}
const BoundAngleSymetry16 = {
    'r' : [8,7,6,5, 4,5,6,7, 8,9,10,11, 12,11,10,9],
    'l' : [0,1,2,3, 4,3,2,1, 0,15,14,13, 12,13,14,15],
    't' : [0,15,14,13, 12,11,10,9, 8,9,10,11, 12,13,14,15],
    'b' : [0,1,2,3, 4,5,6,7, 8,7,6,5, 4,3,2,1 ]
}

export function mkSystems( W ){

    const conditionalAdded1 = ( add, remove ) => condition => id => ( condition( id )?add:remove )( id )
    const conditionalAdded =  add => condition => id => { if ( condition( id ) ) add( id ) }
    const conditionalComponentChange = ( add, remove, has ) => condition => id => {
        const c = condition( id ) 
        if ( has( id ) ){
            if (!c) remove( id )
        } else {
            if (c) add( id )
        }
    }

    
    const list = [
        /*
          ( () => {
          return {
          name : 'dbg',
          onAdded : id => console.log('@system added',id),
          onRemoved : id => console.log('@system removed',id),
          onStep : id => console.log('@system step'),
          }
          })(),
        */
        ( () => {
            const { Components, Items } = W
            let on = new Map()
            function isOn( id ){
                return on.get( id )
            }
            function reset( id ){
                const version = W.getVersion()
                const timeout = Components.timeout.get( id )
                timeout.start = version
            }
            function onStep(){
                on.clear()
                const version = W.getVersion()
                Components.timeout.forEach( ( [ timeoutId, timeout ] ) => {
                    const { start, delay, repeatCount = 1, loop, resetable, startnow } = timeout
                    const elapsed = version - start 
                    if ( elapsed < 0 )
                        return
                    if ( elapsed === 0 ) {
                        if  ( startnow )
                            on.set( timeoutId, iter )
                    } else {
                        const iter = Math.floor( elapsed / delay )
                        const onbeat = ( elapsed % delay ) === 0
                        if ( loop ){
                            if ( onbeat )
                                on.set( timeoutId, iter )
                        } else if ( resetable ){  // bistable
                            if ( iter > 0 )
                                on.set( timeoutId, iter )
                        } else if ( repeatCount ){
                            if ( ( iter <= repeatCount ) && onbeat )
                                on.set( timeoutId, iter )
                            //Items.remove( timeoutId )
                            /*} else {
                              if ( ( iter === 1 ) && onbeat ){
                              on.set( timeoutId, iter )
                              }*/
                        }
                    }
                })
            }
            return {
                name : 'timeout',
                onStep,
                isOn,
                reset,
                
            }
        })(),
        ( () => {
            const { Components, Items } = W
            const playersByTeam = new Map()
            return {
                name : 'team',
            }
        })(),
        
        ( () => {
            return {
                name : 'animation',
                onStep : () => {
                    W.Components.animation.forEach( ([id,animation]) => {
                        const { timeoutId, playlist } = animation
                        const isOn =  W.Systems.timeout.isOn(
                            ( timeoutId !== undefined )?(timeoutId):id
                        )
                        if ( isOn === undefined ){
                            if ( animation.step === undefined ){
                                animation.step = playlist?(playlist[0]):0
                            }
                        } else {
                            if ( playlist === undefined ){
                                animation.step = isOn
                            } else if ( playlist.length ){
                                const stepIndex = isOn % playlist.length
                                const step = playlist[ stepIndex ]
                                animation.step = step
                            }
                        }
                    })
                }
            }
        })(),
        ( () => {
            const { Components } = W,
                  countById = new Map()
            return {
                name : 'placer', // TODO placement + position
                onStep : () => {
                    W.Components.placement.forEach( ([id]) => {

                        const position = Components.position.get( id )
                        if  ( position === undefined )
                            return
                        
                        const placement = Components.placement.get( id ),
                              { x1, y1, x2, y2 } = placement,
                              x = x1 + ( x2 - x1 ) * Math.random(),
                              y = x1 + ( x2 - x1 ) * Math.random()
                        
                        position.x = x
                        position.y = y
                        countById.set( id, 0 )
                    })
                },
                onComponentChange : id => {
                    if ( Components.placement.has( id ) )
                        return
                    countById.delete( id )
                },
                onRemove : countById.delete.bind( countById ),
                isAvailable : id => {
                    const count = countById.get( id )
                    return ( count === 0 )
                },
                getOccupation : id => {
                    return countById.get( id )
                },
                addOccupation : id => {
                    const count = countById.get( id )
                    if ( count === undefined )
                        return
                    countById.set( id, count + 1 )
                }
            }
        })(),
        ( () => {
            return {
                name : 'cipiu'
            }
        })(),
        
        ( () => {
            const {  Components, Items } = W

            const inputByPlayerName = new Map()
            const actuatorsIds = new Set()
            
            function onAdded( id ){
                if ( Components.actuator.has( id ) ){
                    const actuator = Components.actuator.get( id )
                    const playerName = actuator.playerName                    
                    if ( !inputByPlayerName.has( playerName ) ){
                        inputByPlayerName.set( playerName, {} )
                    }
                    actuatorsIds.add( id )
                }
            }
            function onRemoved( id ){
                if ( Components.actuator.has( id ) ){
                    const actuator = Components.actuator.get( id )
                    //const name = actuator.playerName
                    //inputByPlayerName.delete( name)
                    actuatorsIds.delete( id )
                }
                if ( Components.player.has( id )  ){
                    const player = Components.player.get( id )
                    //inputByPlayerName.delete( player.name )
                }
            }
            function handleInput( playerName, inputs ){
                // grab inputs
                const playerInput = inputByPlayerName.get( playerName )
                if ( playerInput === undefined )
                    return
                inputs.forEach( command => {
                    const count = 1
                    if ( playerInput[ command ] ===  undefined ){
                        playerInput[ command ] = count
                    } else {
                        playerInput[ command ] += count
                    }
                })
            }
            function resetInput(){
                inputByPlayerName.forEach( input => {
                    Object.keys( input ).forEach( command => {
                        input[ command ] = 0
                    })
                } )
            }
            function onStep(){
                // dispatch
                actuatorsIds.forEach( id => {
                    const actuator = Components.actuator.get( id )
                    const playerName = actuator.playerName
                    const input = inputByPlayerName.get( playerName )
                    if ( actuator && playerName && input ){
                        _actuate( actuator, input )
                    } else {
                        //console.log('no actuator?',id,{ actuator , playerName , input  })
                    }
                })
                resetInput()
            }
            
            function _actuate( actuator, input ){
                const { targetId, timeoutId, commands } = actuator
                
                function actuatorHasCommand( command ){
                    return actuator
                        && actuator.commands
                    // && ( actuator.commands.indexOf( x => x === command ) !== -1 )
                        && ( actuator.commands.find( x => x === command ) )
                }

                
                const ready = ( timeoutId === undefined )
                      ||  W.Systems.timeout.isOn( timeoutId )
                
                if (!ready){
                    return
                } 
                let didSomething = false

                if ( ( actuatorHasCommand('powerup') || actuatorHasCommand('powerdown') ) ){
                    const propulsor = Components.propulsor.get( targetId )
                    if ( propulsor ){
                        const nPowerup = input['powerup'] || 0
                        const nPowerdown = input['powerdown'] || 0
                        const powerDir = Math.max(-1,Math.min( nPowerup - nPowerdown, 1))
                        if ( powerDir !== 0 ){
                            const { power, min, max } = propulsor
                            propulsor.power = clamp( power + powerDir, min, max )
                            didSomething = 1
                        }
                    }
                }
                
                if ( ( actuatorHasCommand('noseup') || actuatorHasCommand('nosedown') ) ){
                    const direction = Components.direction.get( targetId )
                    if ( direction ){
                        const { a16, a8 } = direction
                        const nNoseup = input['noseup'] || 0
                        const nNosedown = input['nosedown'] || 0
                        const noseDir = Math.max(-1,Math.min( nNoseup - nNosedown, 1))
                        if ( noseDir !== 0 ){
                            if ( a16 !== undefined ){ 
                                direction.a16 = ( 16 + direction.a16 + noseDir ) % 16
                            } else if ( a8 !== undefined ){
                                direction.a8 = ( 8 + direction.a8 + noseDir ) % 8
                            }                            
                            didSomething = 2
                        }
                    }
                }

                if ( ( actuatorHasCommand('reverse') ) ){
                    const r = Components.r.get( targetId )
                    if ( r ){
                        const count = input['reverse'] || 0
                        const previous = r.r || 0
                        r.r = ( count + previous ) % 2
                        didSomething = ( previous !== r.r )?3:didSomething
                    }
                }

                const launcher = Components.launcher.get( targetId )
                const position = Components.position.get( targetId )
                
                if ( ( launcher !== undefined )
                     && ( position !== undefined )
                     && ( ( actuatorHasCommand('firemissile') && input['firemissile'] )
                          || ( actuatorHasCommand('firebomb') && input['firebomb'] ) ) ){
                    
                    const direction = Components.direction.get( targetId )                  
                    
                    const launches = input['firemissile'] || input['firebomb']
                    if ( launches ){
                        const model = Components.model.get( launcher.modelId )
                        const speed = Components.speed.get( targetId )
                        if ( model ){
                            const inheritFromLauncher =  {
                                direction : direction,
                                position : { x : position.x, y : position.y },
                            }
                            const color = Components.color.get( targetId )
                            if ( color ){
                                inheritFromLauncher.color = color
                            }
                            const dropped = W.Items.create(
                                Object.assign( {}, model.model, inheritFromLauncher )
                            )
                            const droppedSpeed = W.Components.speed.get( dropped )
                            if ( speed && droppedSpeed ){
                                if ( droppedSpeed.pps === undefined ){
                                    droppedSpeed.pps = clamp( speed.pps + 1,
                                                              droppedSpeed.min,
                                                              droppedSpeed.max)
                                }
                            }
                            didSomething = 4
                        }
                    }
                }
                
                if ( didSomething ){
                    if ( timeoutId !== undefined ){
                        W.Systems.timeout.reset( timeoutId )
                    }
                }

            }
            
            return {
                name : 'commands',
                onAdded,
                onRemoved,
                onStep,
                handleInput,
            }
        })(),

        ( () => {
            const { Components } = W
            const ids = new Set(),
                  add = ids.add.bind( ids ),
                  remove = ids.delete.bind( ids ),
                  has = ids.has.bind( ids )
            const condition =  id => ( Components.position.has( id )
                                       && Components.direction.has( id )
                                       && Components.speed.has( id )
                                       && (!Components.attachement.has( id )))
            return {
                name : 'fly',
                onAdded : conditionalAdded( add )( condition ),
                onComponentChange : conditionalComponentChange( add, remove, has )( condition ),
                onRemoved : remove,
                onStep : () => ids.forEach( id => {
                    const position = Components.position.get( id )
                    const { a8, a16 } = Components.direction.get( id )                    
                    const speed = Components.speed.get( id )
                    
                    const propulsor = Components.propulsor.get( id )
                    const fly = Components.fly.get( id )

                    const freefall =  ( propulsor === undefined ) || ( propulsor.power === 0 )
                    if ( fly ){
                        fly.freefall = freefall
                    }
                    if ( !freefall ){
                        speed.pps = propulsor.power
                    }
                    
                    const direction = ( a8 !== undefined )
                        ?( directions8[ a8 ] ):( directions16[ a16 ] )
                    position.x += direction[ 0 ] * speed.pps
                    position.y += direction[ 1 ] * speed.pps
                })
            }
        })(),
        // ( () => {
        //     const { Components, getVersion } = W
        //     const ids = new Set(),
        //           add = ids.add.bind( ids ),
        //           remove = ids.delete.bind( ids )
        //     return {
        //         name : 'players',
        //         onAdded : conditionalAdded( add, remove )(
        //             id => Components.player.has( id )
        //         ),
        //         onRemoved : remove,
        //         onStep : () => ids.forEach( id => {
        
        //         })
        //     }
        // })(),
        ( () => {
            const { Components, getVersion } = W
            const ids = new Set(),
                  add = ids.add.bind( ids ),
                  remove = ids.delete.bind( ids ),
                  has = ids.has.bind( ids ),
                  condition = id => ( Components.mass.has( id )  && Components.position.has( id ) )
            return {
                name : 'gravity',
                onAdded : conditionalAdded( add )( condition ),
                onComponentChange : conditionalComponentChange( add, remove, has )( condition ),
                onRemoved : remove,
                onStep : () => ids.forEach( id => {
                    const version = W.getVersion()
                    const { mass } =  Components.mass.get( id )
                    const position = Components.position.get( id )
                    position.y -= clamp( mass / 16,0.1,4)

                    const fly = Components.fly.get( id )
                    if ( fly && fly.freefall ){
                        const direction = Components.direction.get( id )
                        if ( direction ){
                            if ( ( version % 10*10 ) === 0 ){
                                if ( direction !== undefined ){
                                    if ( direction.a8 !== undefined ){
                                        direction.a8 = toFall8[ direction.a8 ]
                                    } else if ( direction.a16 !== undefined ){
                                        const a = toFall16[ direction.a16 ]
                                        direction.a16 = a
                                    }
                                }
                            }
                        }
                        const speed = Components.speed.get( id )
                        if ( speed && direction ){
                            if (( direction.a8 === 6 )||(direction.a16 === 12)){
                                speed.pps = clamp( ( speed.pps || 0 ) + 1,
                                                   speed.min, speed.max )
                            }
                        }
                    }
                })
            }
        })(),
        ( () => {
            const { Components  } = W
            return {
                name : 'attach',
                onStep : () => {
                    Components.attachement.forEach( ([ id, attachement ]) => {
                        const { attachedToId, location, radius,
                                noDirection, noPosition, noSpeed,
                                noColor } = Components.attachement.get( id )

                        if ( !noDirection ){
                            const attachementDirection = Components.direction.get( id )
                            const attachedToDirection = Components.direction.get( attachedToId )
                            if (( attachementDirection !== undefined ) && ( attachedToDirection != undefined ) ){
                                let a16
                                if ( attachedToDirection.a16 !== undefined ){                                
                                    attachementDirection.a16 = attachedToDirection.a16
                                } else if ( attachedToDirection.a8 !== undefined ){
                                    attachementDirection.a8 = attachedToDirection.a8
                                }
                            }
                        }
                        if ( !noPosition ){
                            const attachementDirection = Components.direction.get( id )
                            const attachementPosition = Components.position.get( id )
                            const attachedToPosition = Components.position.get( attachedToId ) 
                            if (( attachementPosition !== undefined ) && ( attachedToPosition != undefined ) ){
                                const r = Components.r.get( attachedToId )
                                if ( radius ){
                                    const offset = getRelativeAttachementPosition(
                                        attachementDirection || { a16 : 0 },
                                        r || 0,
                                        radius,
                                        location
                                    )
                                    attachementPosition.x = attachedToPosition.x + offset.x
                                    attachementPosition.y = attachedToPosition.y + offset.y
                                } else {
                                    attachementPosition.x = attachedToPosition.x
                                    attachementPosition.y = attachedToPosition.y
                                }
                            }
                        }
                        if ( !noSpeed ){
                            const attachementSpeed = Components.speed.get( id )
                            const attachedToSpeed = Components.speed.get( attachedToId )
                            if (( attachementSpeed !== undefined ) && ( attachedToSpeed != undefined ) ){
                                attachementSpeed.pps = attachedToSpeed.pps
                            }
                        }

                        if ( !noColor ){
                            const attachementColor = Components.color.get( id )
                            const attachedToColor = Components.color.get( attachedToId )
                            if (( attachementColor !== undefined ) && ( attachedToColor != undefined ) ){
                                attachementColor.cs = attachedToColor.cs
                            }
                        }
                    })
                }
            }
        })(),
        ( () => {
            const heightMapFunctions = new Map()
            return {
                name : 'heightmap',
                onAdded : id => {
                    const heightmap = W.Components.heightmap.get( id )
                    if ( heightmap ){
                        const { type } = heightmap
                        if ( type === HEIGHTMAP_TYPE.island ){
                            const island = Island( heightmap )
                            heightMapFunctions.set( id, island )
                        } else if ( type === HEIGHTMAP_TYPE.water ){
                            const water = Water( heightmap )
                            heightMapFunctions.set( id, water )
                        }
                    }
                },
                onComponentChange : id => {
                    if (!W.Components.heightmap.has( id )){
                        heightMapFunctions.delete( id )
                    }
                },
                onRemoved : heightMapFunctions.delete.bind( heightMapFunctions ),
                getDimensions : (id) => {
                    const position = W.Components.position.get( id )
                    const heightmapf = heightMapFunctions.get( id )
                    if ( position && heightmapf ){
                        return heightmapf.getDimensions( position )
                    }
                },
                getHeightAt : (id, x) => {
                    const position = W.Components.position.get( id )
                    const heightmapf = heightMapFunctions.get( id )
                    if ( position && heightmapf ){
                        return heightmapf.heightAt( position, x )
                    }
                }
                
            }
        })(),
        ( () => {
            const { Components  } = W,
                  ids = new Set(),
                  add = ids.add.bind( ids ),
                  remove = ids.delete.bind( ids ),
                  has = ids.has.bind( ids ),
                  condition = id => ( ( Components.sprite.has( id )
                                        || Components.heightmap.has( id )
                                        // || (Components.placement.has( id ) )
                                      )
                                      && Components.bb.has( id ) )
            return {
                name : 'boundingboxesandmasks',
                onAdded : conditionalAdded( add )( condition ),
                onComponentChange : conditionalComponentChange( add, remove, has )( condition ),
                onRemoved : remove,
                onStep : () => ids.forEach( id => {
                    const bb = Components.bb.get( id )
                    const sprite = Components.sprite.get(id)
                    if ( sprite ){
                        const sprData = itemToSpriteData( W, id )
                        const { w, h } = getSpriteDimensions( sprite.type, sprData )
                        bb.w = w
                        bb.h = h
                        return
                    }
                    const heightmap = Components.heightmap.get( id ) 
                    if ( heightmap ){
                        const { w, h } = W.Systems.heightmap.getDimensions( id )
                        bb.w = w
                        bb.h = h
                        const position = Components.position.get(id)
                        if ( position ){
                            //position. y = bb.h / 2
                            //position.y = bb.h / 2
                            //console.log('HERE', bb, position)
                        }
                        return
                    }
                    // const placement = Components.placement.get( id )
                    // if ( placement ) {
                    //     const { w, h } = placement
                    //     bb.w = w
                    //     bb.h = h
                    //     return
                    // }
                })
            }
        })(),
        ( () => {
            const { Components  } = W
            return {
                name : 'bounds',
                onStep : () => {
                    Components.position.forEach( ([ id, position ]) => {

                        if ( Components.attachement.has( id ) )
                            return
                        
                        const bb = Components.bb.get(id)
                        let left = worldSize.x1
                        let right = worldSize.x2
                        let bottom = worldSize.y1 
                        let top = worldSize.y2 
                        if ( bb ){
                            left += bb.w / 2
                            bottom += bb.h / 2
                            right -= bb.w / 2
                            top -= bb.h / 2
                        }
                        const worldbounds = Components.worldbounds.get( id )
                        const direction =  Components.direction.get( id )
                        let bounce = ( ( direction !== undefined )
                                       && ( direction.a16 !== undefined ) ), // TODO a8
                            die = false,
                            noclamp =false
                        
                        if ( worldbounds ){
                            bounce = bounce && ( worldbounds.nobounce !== true )
                            die = worldbounds.die
                            noclamp = worldbounds.noclamp
                        }
                        const { x, y } = position

                        let isOut = false
                        if ( x > right ){
                            if ( bounce )
                                direction.a16 = BoundAngleSymetry16.r[ direction.a16 ]
                            isOut = true
                        } else if ( x < left ){
                            if ( bounce )
                                direction.a16 = BoundAngleSymetry16.l[ direction.a16 ]
                            isOut = true
                        } 
                        if ( y > top ){
                            if ( bounce )
                                direction.a16 = BoundAngleSymetry16.t[ direction.a16 ]
                            isOut = true
                        } else if ( y < bottom ){
                            if ( bounce )
                                direction.a16 = BoundAngleSymetry16.b[ direction.a16 ]
                            isOut = true
                        }
                        if ( isOut && die ){
                            W.Items.remove( id )
                            return 
                        }
                        if ( !noclamp ){
                            position.x = clamp( position.x, left, right )
                            position.y = clamp( position.y, bottom, top )
                        }
                        
                    })
                    
                }
            }
        })(),
        
        ( () => {
            const ids = new Set(),
                  add = ids.add.bind( ids ),
                  remove = ids.delete.bind( ids ),
                  has = ids.has.bind( ids ),
                  condition = id => Components.position.has( id ) && Components.bb.has( id ) && Components.collision.has( id )
            const { Components } = W
            const lastColls = []
            
            
            function _computeRectangle( {x,y}, {w,h} ){
                return [ x - w / 2, y - h / 2, x + w / 2, y + h / 2 ]
            }
            function collisionLogicCollides( id1, id2 ){
                const c1 = Components.collision.get( id1 )
                const c2 = Components.collision.get( id2 )
                const sprite1 = Components.sprite.get( id1 )
                const sprite2 = Components.sprite.get( id2 )
                if ( c1 && c2 ){
                    // group
                    if (( c1.group !== undefined ) && ( c1.group === c2.group ) ){
                        return ( c1.group > 0 )?true:false
                    }
                    // mask and category
                    const c1c = c1.category
                    if ( c1c === undefined  ) return undefined
                    const c1m = c1.mask || 0
                    if ( c1m === undefined  ) return undefined                    
                    const c2c = c2.category || 0
                    if ( c2c === undefined  ) return undefined                    
                    const c2m = c2.mask || 0
                    if ( c2m === undefined  ) return undefined                    
                    const collide = ( ( c1c & c2m ) != 0 ) &&  ( ( c2c & c1m ) != 0 )
                    return collide
                }
            }
            function handleCollision12( id1, id2, box1, box2 ){                
                const attack2 = W.Components.attack.get( id2 )
                if ( attack2 ){
                    const collisionAttack =  attack2.collision
                    if ( collisionAttack ){
                        W.Systems.health.inflictDamage( id1, collisionAttack /*{ quality : 0, quantity : 1 } */)
                    }
                }
                const placement = W.Components.placement.get( id1 )
                if ( placement ){
                    W.Systems.placer.addOccupation( id1 )
                }
            }
            function collisionBottomHitbox12( id1, id2, box1, box2 ){
                const sprite = Components.sprite.get( id1 )
                const heightmap = Components.heightmap.get( id2 )
                if ( sprite && heightmap ){

                    //const player = Components.player.get( id1 )
                    //  if ( player ){
                    const spritePosition = Components.position.get( id1 )
                    const spriteDirection = Components.direction.get( id1 )
                    const spriteR  = Components.r.get( id1 )
                    const spriteSprite  = Components.sprite.get( id1 )
                    const heigthmapPosition = Components.position.get( id2 )

                    const spriteData = itemToSpriteData( W, id1 )
                    const bhm = getBottomHitMask(
                        spriteSprite.type, spriteData
                    )
                    if ( bhm === undefined ){
                        console.log('no hitbox!',{sprite,spritedef,heightmap})
                    }
                    //if ( bhm === undefined )
                    //return undefined
                    const x1 = Math.floor( Math.max( box1[ 0 ], box2[ 0 ] ) ),
                          y1 = Math.floor( Math.max( box1[ 1 ], box2[ 1 ] ) ),
                          x2 = Math.floor( Math.min( box1[ 2 ], box2[ 2 ] ) ),
                          y2 = Math.floor( Math.min( box1[ 3 ], box2[ 3 ] ) )
                    
                    let collides = []
                    let penetration = 0
                    {
                        for ( let i = 0, l = (x2 - x1) ; i < l ; i++){
                            const h = W.Systems.heightmap.getHeightAt(
                                id2, Math.floor( x1 + i )
                            )                                
                            const spriteBottom = bhm.mask[
                                Math.floor( x1 + i - box1[ 0 ] )
                            ] + box1[ 1 ]
                            if ( ( h !== undefined ) && ( spriteBottom !== undefined ) ){
                                if ( spriteBottom < h ){
                                    const penetration = h - spriteBottom
                                    return penetration
                                }
                            }
                        }
                        return false
                    }
                } else {
                    return undefined
                }
            }
            return {
                name : 'collision',
                getCollidingPairs : () => lastColls,
                onAdded : conditionalAdded( add )( condition ),
                onComponentChange : conditionalComponentChange( add, remove, has )( condition ),
                onRemoved : remove,
                onStep : () => {

                    lastColls.length = 0
                    
                    const size = ids.size,
                          orderedIds = new Array( size ),
                          boxes = new Array( size )
                    let idx = 0
                    for ( let id of ids ){
                        const bb = Components.bb.get( id ),
                              position = Components.position.get( id ),
                              box = _computeRectangle( position, bb )
                        boxes[ idx ] = box
                        orderedIds[ idx ] = id
                        idx++
                    }
                    
                    const intersections = boxIntersect( boxes)
                    
                    intersections.forEach( ([ i1, i2 ]) => {
                        const id1 = orderedIds[ i1 ],
                              id2 = orderedIds[ i2 ]

                        
                        const logic = collisionLogicCollides( id1, id2 )
                        if ( logic === false )
                            return
                        
                        const box1 = boxes[ i1 ],
                              box2 = boxes[ i2 ]
                        {
                            let bottom = collisionBottomHitbox12( id1, id2, box1, box2 )
                            if ( bottom === undefined )
                                bottom = collisionBottomHitbox12( id2, id1, box2, box1 )                            
                            if ( bottom === false )
                                return 
                        }
                        
                        lastColls.push( { id1, id2, box1, box2 } )
                        
                        handleCollision12( id2, id1, box2, box1 )
                        handleCollision12( id1, id2, box1, box2 )
                        
                    })
                }
            }
        })(),
        ( () => {
            const damage = new Map()
            const death = new Set()
            const tookdamage = new Set()
            function didTakeDamage( id ){
                return tookdamage.has( id )
            }
            const { Components } = W
            function isAlive( id ){
                const health = Components.health.get( id )
                if ( health ){
                    return _isAlive( health )
                }
            }
            function justDied( id ){
                return death.has( id )
            }
            function getDeathList(){
                return death
            }
            function getOrCreateDamages( id ){
                if ( Components.health.has( id ) ){
                    let d = damage.get( id )
                    if ( d === undefined ){
                        d = []
                        damage.set( id, d )
                    }
                    return d
                }
            }
            function inflictDamage( id, damage ){
                const health = Components.health.get( id )
                if ( health === undefined )
                    return
                
                if (_toYoungToDie( health ) )
                    return

                const d = getOrCreateDamages( id )
                if ( d === undefined ) return
                d.push( damage )
                return true
            }
            function _isAlive( health ){
                return ( health.life > 0 )
            }
            function _age( health ){
                const { birth } = health
                return W.getVersion() - birth
            }
            function _toYoungToDie( health ){
                if ( health.tytd === undefined )
                    return
                return  _age( health ) < health.tytd
            }
            function _applyDamage( health, damage ){
                //const { quantity } = damage

                const quantity  = damage
                health.life -= quantity
            }
            function onStep( ){
                death.clear()
                tookdamage.clear()
                damage.forEach( ( list, id ) => {
                    const health = Components.health.get( id )
                    //console.log('-',id,health,list)
                    const aliveBefore = _isAlive( health )
                    // if ( health === undefined ){ damage.delete( id ) }
                    const damagers = []
                    while ( list.length ){
                        _applyDamage( health, list.shift() )
                    }
                    const aliveAfter = _isAlive( health )
                    if ( aliveBefore && (!aliveAfter ) ){
                        death.add( id )
                    }
                    tookdamage.add( id )
                })
                damage.clear()
            }
            return {
                name : 'health',
                onStep,
                inflictDamage,
                isAlive,
                justDied,
                getDeathList,
                didTakeDamage,
            }
        })(),
        ( () => {
            const { Components, Items } = W
            const backrefs = new Map() 
            const removeList = []
            function addBackRef( srcId, dstId ){
                // dstId : targetId
                let srcIds = backrefs.get( dstId )
                if ( srcIds === undefined ){
                    srcIds = new Set()
                    backrefs.set( dstId, srcIds )
                }
                srcIds.add( srcId )
            }
            function onRemoved( id ){
                const srcIds = backrefs.get( id )
                if ( srcIds !== undefined ){
                    srcIds.forEach( srcId => {
                        removeList.push( srcId )
                    })
                }
            }
            function onStep(){
                while ( removeList.length ){
                    const id = removeList.shift()
                    Items.remove( id )
                }
            }
            function onAdded( id ){
                if ( Components.removeWith.has( id ) ){
                    const withIds = Components.removeWith.get( id ).ids
                    withIds.forEach( withId => {
                        addBackRef( id, withId )
                    })
                }
                if ( Components.actuator.has( id ) ){
                    const { targetId, timeoutId } = Components.actuator.get( id )
                    if ( ( targetId !== undefined )
                         && ( targetId !==id ) ){
                        addBackRef( id, targetId )
                    }
                    if ( ( timeoutId !== undefined )
                         && ( targetId !== undefined )
                         && ( targetId !== timeoutId  ) ){
                        addBackRef( timeoutId, targetId )
                    }
                }
            }
            return {
                name : 'garbage',
                onAdded,
                onRemoved,
                onStep,
            }
        })(),
    ]
    const byName = list.reduce( (r,x) => {
        r[ x.name ] = x
        return r
    },{})
    return Object.assign(
        { forEach : list.forEach.bind( list ) },
        byName
    )
}
