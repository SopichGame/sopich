import { PLANE_INPUT_NAMES as InputNames } from '../../game.js'

export const InputNumByName = InputNames.reduce( (r,name,i) => {
    r[ name ] = i
    return r
},{})
//
// input maps { up : 5x, down : 3x } -> [ 0, 5, 2, 3 ]
//
export function compressInputsMap( inputs ){
    const payload = []
    for ( let [ name, count = 0 ] of inputs.entries() ){
        const inputNum = InputNumByName[ name ]
        if ( inputNum === undefined ) throw new Error('undefined input',name)
        payload.push( inputNum )
        payload.push( count )
    }
    return payload
}
export function decompressInputsMap( array ){

    if ( array === undefined )
        return undefined

    const inputs = new Map()
    for ( let i = 0, l = ( array.length - 1 ) ; i < l ; i+=2 ){
        const num = array[ i ]
        const value = array[ i + 1 ]
        const name = InputNames[ num ]
        if ( name !== undefined ){
            inputs.set( name, value )
        }
    }
    return inputs
}
//
// Input repeat Lists
//
// [ a a a b b c d d e ] -> [ [a 3][b 2][c 1][d 2][e 1 ] ]
export function listToRepeatList( list ){
    return list
        .reduce( (r,x) => {
            const previous = r[ r.length - 1 ]
            if ( previous && ( previous[ 0 ] === x ) ){
                previous[ 1 ]++
            } else {
                r.push( [ x, 1 ] )
            }
            return r
        },[])
}
export function repeatListToList( repeat ){
    return repeat.reduce( (r,[x,count]) => (
        [ ...r, ...new Array( count ).fill( x ) ]
    ),[])
}
export function compressInputsList1( list ){
    const payload = []
    const repeatList = listToRepeatList( list )
    repeatList.forEach( ([ name, count]) => {
        const inputNum = InputNumByName[ name ]
        if ( inputNum === undefined ) throw new Error('undefined input',name)
        payload.push( inputNum )
        payload.push( count )
    })
    return payload
}
export function decompressToInputsList1( array ){
    const repeatList = []
    for ( let i = 0, l = ( array.length - 1 ) ; i < l ; i+=2 ){
        const num = array[ i ]
        const value = array[ i + 1 ]
        const name = InputNames[ num ]
        repeatList.push( [ name, value ] )
    }
    const list = repeatListToList( repeatList )
    return list
}
