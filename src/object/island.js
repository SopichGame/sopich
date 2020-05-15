const Spline = require('cubic-spline');
const seedrandom = require('seedrandom');
import { clamp } from '../utils.js'

export function Island( { w, hmin, hmax, seed, period } ){
    
    const h = hmax
    const rng = seedrandom( seed )

    let spline
    let nPeriods = clamp( Math.floor( w / period ), 1, 20 )
    let uPeriod = w / nPeriods
    const hdiff = hmax - hmin
    {
        const xs = []
        const ys = []
        for ( let i = 0 ; i < ( nPeriods + 1 ) ; i++ ){
            xs.push( i * uPeriod )
            ys.push( hmin + hdiff * rng() )
        }
        spline = new Spline(xs, ys);
    }
    let heightmap = []
    let real_y2   
    {
        for ( let i = 0 ; i < w ; i++ ){
            let sh = spline.at( i )
            if ( isNaN( sh ) ){
                sh = 0
            }
            sh = clamp( sh, hmin, hmax )
            const relDistToCenter = Math.abs( w / 2 - i ) / ( w / 2 )

            const squareshapper = 1
            const flatShaper = Math.pow( 1 - relDistToCenter , 0.0625 )
            const mosqueeShaper = Math.pow( 1 - relDistToCenter , 0.5 )
            const triangleShaper = Math.pow( 1 - relDistToCenter , 1 )
            const sandpileShaper = Math.pow( 1 - relDistToCenter , 2 )
            const pointyShaper = Math.pow( 1 - relDistToCenter , 4 )
            //const h = sh * mosqueeShaper
            let h
            /*
            if ( (i%3) === 0 ){
                h = hmax
            } else if ( (i%3) === 1 ){
                h = 0
            } else if ( (i%3) === 2 ){
                h = sh * mosqueeShaper
            }*/
                h = sh * mosqueeShaper
            heightmap[ i ] =  h
            if ( ( real_y2 === undefined ) || ( h > real_y2 ) ){
                real_y2 = h
            }
        }
    }
    function heightAt( islandPosition, x ){
        const x1 = islandPosition.x - w / 2
        const y1 = islandPosition.y - real_y2 / 2
        const idx = Math.floor( x - x1 )
        if ( ( 0 <= idx ) && ( idx < w ) ){
            return  y1 + heightmap[ idx ]
        }
        return undefined
    }
    function zeroAt( islandPosition, x ){
        const y1 = islandPosition.y - real_y2 / 2
        return y1
    }
    function getDimensions( islandPosition ){
        const y1 = islandPosition.y - real_y2 / 2
        const y2 = islandPosition.y + real_y2 / 2
        return {
            w,
            h : ( y2 - y1 )
        }
            
    }
    //    console.log({ islandLevelAt, w, h, seed  })
    return { zeroAt, heightAt, getDimensions }
}
