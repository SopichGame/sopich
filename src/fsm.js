export function Fsm( transitions, _on ){
    const on = Object.assign( {
        leave : {},
        enter : {},
        transition : {},
        error : undefined
    }, _on )
    function run( initialState ){
        const onError = on.error
        const onEnter = on.enter[ initialState ]
        let state = initialState
        if ( onEnter ) onEnter( { to : state } )
        const send = transitions.reduce( (r, transition ) => {
            const { name, from, to } = transition
            const onLeave = on.leave[ from ]
            const onEnter = on.enter[ to ]
            const onTransition = on.transition[ name ]
            r[ name ] = () => {
                if ( state === from ){
                    if ( onLeave ) onLeave( transition )
                    state = to
                    if ( onTransition ) onTransition( transition )
                    if ( onEnter ) onEnter( transition )
                } else if ( onError ){
                    onError( { state, transition } )
                }
            }
            return r
        }, {} )
        return { send, getState : () => state }
    }
    return { on, run }
}

// const transitions = [
//     { name : 'melt', from: 'solid',  to: 'liquid' },
//     { name : 'freeze' ,  from: 'liquid', to: 'solid'  },
//     { name : 'vaporize', from: 'liquid', to: 'gas'    },
//     { name : 'condense',  from: 'gas',    to: 'liquid' }
// ]
// const handlers = {
//     enter : { liquid : () => console.log('entring liquid') },
//     leave : { liquid : () => console.log('leaving liquid') },
//     error : (...p) => console.log('error',...p)
// }
// const fsm = Fsm( transitions, handlers )
// fsm.on.enter.solid = () => console.log('entring solid')
// fsm.on.transition.vaporize = () => console.log('= vapo !')
// const { send, getState } = fsm.run( 'solid' )
// send.melt()
// send.vaporize()
// send.vaporize()
// console.log( getState() )

