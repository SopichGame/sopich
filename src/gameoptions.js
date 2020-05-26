export function OptionsParser( Definitions ){
    const valueParsers = {}
    valueParsers.parseBool = function( prebool ){
        if ( ( prebool === 'true') || ( prebool === true ) ) return true
        else if ( ( prebool === 'false') || ( prebool === false ) ) return false
        else return undefined
    }    
    valueParsers.parseNatural = function( prenatural ){
        try {
            const nat = parseInt( prenatural )
            if ( nat >= 0 )
                return nat
        } catch (e){
        }
    }
    valueParsers.parsePositiveNatural = function( pre ){
        const p = valueParsers.parseNatural( pre )
        if ( p !== undefined )
            if ( p !== 0 )
                return p
    }
    
    function parseOptions( options ){
        return Object.keys( Definitions ).reduce( (parsed,name) => {
            const pre = options[ name ]
            const { parser, defaults } = Definitions[ name ]
            if ( pre !== undefined ) {

                const parse = valueParsers[ parser ]
                if ( parse === undefined )
                    throw new Error(`no option parser named '${ parser  }'`)
                
                const value = parse( pre )
                
                if ( value === undefined ){
                    console.error(`wrong value for ${ name } : ${ pre } while using ${ parser }`)
                } else {
                    parsed[ name ] = value
                    return parsed
                }
            }
            parsed[ name ] = defaults
            return parsed
        },{})
    }
    return { parseOptions }
}
