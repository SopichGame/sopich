export function Players( $container ) {
    const on = {}
    if ( ! $container ){
        $container = document.createElement( 'div' )
        $container.classList.add( 'players-list' )
    }    
    function update( name ){
        $container.innerHTML = ''
        const $h3 = document.createElement('h3')
        $h3.textContent = 'Players'
        $container.appendChild( $h3 )
        fetch(`game/${name}/players`)
            .then( x => x.json() )
            .then( players => {
                const $players = document.createElement( 'p' )
                $players.textContent = ( players.length )
                    ?( `${ players.join(', ') }` )
                    :( 'nobody' )                
                $container.appendChild( $players )
            })
    }
    return { $container, update, on }
}
