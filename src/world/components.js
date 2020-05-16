/*
 * Components
 */
function cmpStrg( { copy } ){
    // simple component storage based on Map
    const props = new Map()
    return {
        has : id => props.has( id ),
        get : id => props.get( id ),
        add : ( id, model ) => {
            props.set( id, copy( model ) )
        },
        remove : id => props.delete( id ),
        forEach : f => {
            for ( let [ id, prop ] of props.entries() ){
                f([id,prop])
            }
        },
        entries : props.entries.bind( props )
    }
}
export function mkComponents(){
    const byName = {
        model : cmpStrg( {
            copy : ( { model } ) => ( {
                model
            } )
        }),
        propulsor : cmpStrg( {
            copy : ( { power, min, max } ) => ( {
                power, min, max
            } )
        }),
        position : cmpStrg( {
            copy : ( { x, y } ) => ( {
                x, y
            } )
        }),
        speed : cmpStrg( {
            copy : ( { pps, min, max } ) => ( {
                pps, min, max
            } )
        }),
        ttl : cmpStrg( {
            copy : ( { ttl, atZero, spawnother, removeself, respawn } ) => ( {
                ttl, atZero, model, spawnother, removeself, respawn
            } )
        }),
        direction : cmpStrg( {
            copy : ( { a8, a16 } ) => ( {
                a8, a16
            } )
        }),
        r : cmpStrg( {
            copy : ( { r } ) => ( {
                r
            } )
        }),
        player :  cmpStrg( {
            copy : ( { name, score } ) => ( {
                name, score
            } )
        }),
        actuator : cmpStrg( {
            copy : ( { /* type, */ playerName, targetId,  timeoutId, commands } ) => ( {
                /* type, */ playerName, targetId, timeoutId, commands
            })            
        }),
        placement :  cmpStrg( {
            copy : ( {  x1, y1, x2, y2 } ) => ( {
                 x1, y1, x2, y2
            } )
        }),
        sprite :  cmpStrg( {
            copy : ( { type, subtypes } ) => ( {
                type, subtypes
            } )
        }),
        timeout : cmpStrg( {
            copy : ( { start, delay, repeatCount, loop, resetable, startnow } ) => ( {
                start, delay, repeatCount, loop, resetable, startnow
            } )
        }),
        bb : cmpStrg( {
            copy : ( { w, h } ) => ( {
                w, h
            } )
        }),
        collision : cmpStrg( {
            copy : ( { category, mask, group } ) => ( {
                category, mask, group
            } )
        }),
        mass :  cmpStrg( {
            copy : ( { mass } ) => ( {
                mass
            } )
        }),
        attachement : cmpStrg( {
            copy : ( { attachedToId, location, radius, noDirection, noPosition, noSpeed } ) => ( {
                attachedToId, location, radius, noDirection, noPosition, noSpeed
            } )
        }),
        launcher  : cmpStrg( {
            copy : ( { modelId  } ) => ( {
                modelId
            } )
        }),
        removeWith : cmpStrg( {
            copy : ( { ids } ) => ( {
                ids
            } )
            
        }),
        health : cmpStrg( {
            copy : ( { maxLife, life, birth, tytd  } ) => ( {
                maxLife, life, birth, tytd
            })
            
        }),
        fly : cmpStrg( {
            copy : ( { freefall  } ) => ( {
                freefall
            })
        }),
        animation : cmpStrg( {
            copy : ( { timeoutId, playlist  } ) => ( {
                timeoutId, playlist
            })
        }),
        heightmap : cmpStrg( {
            copy : ( { type, seed, w, hmin, hmax, period  } ) => ( {
                type, seed, w, hmin, hmax, period
            })
        }),
        color : cmpStrg( {
            copy : ( { cs  } ) => ( {
                cs
            })
        }),
        attack : cmpStrg( {
            copy : ( { collision } ) => ( {
                collision
            })
        }),
        worldbounds : cmpStrg( {
            copy : ( { nobounce, die, noclamp } ) => ( {
                nobounce, die, noclamp
            })
        }),
        

    }
    return byName
}
