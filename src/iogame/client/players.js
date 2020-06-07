export const PlayerUCS = {
    brain : '🧠',
    gear : '⚙'
}
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
                // const $players = document.createElement( 'p' )
                // $players.textContent = ( players.length )
                //     ?( `${ players.join(', ') }` )
                //     :( 'nobody' )                
                // $container.appendChild( $players )

                const $players = document.createElement( 'div' )
                $players.classList.add('game-players')

                
                Object.entries( players ).map( ([ name, props ]) => {
                    
                    const $player = document.createElement( 'span' )
                    $player.classList.add('players-list-player')
                    const { socket, playing } = props

                    const $icon = document.createElement( 'span' )
                    $icon.classList.add('players-list-player-icon')
                    $icon.textContent = socket?(PlayerUCS.brain):(PlayerUCS.gear)
                    $player.appendChild( $icon )

                    const $name = document.createElement( 'span' )
                    $name.classList.add('players-list-player-name')
                    $name.textContent = name
                    $player.appendChild( $name )
                    
                    $players.appendChild( $player )
                })
                //console.log( 'gp',game )
                /*$players.textContent = ( Object.keys( game.players).length )
                    ?( game.players.join(', ') )
                    :( 'nobody' )            */    
                $container.appendChild( $players )

                
                
            })
    }
    return { $container, update, on }
}
