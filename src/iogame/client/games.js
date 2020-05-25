export function Games( $container ) {
    const on = {}
    if ( ! $container ){
        $container = document.createElement( 'div' )
        $container.classList.add( 'games-list' )
    }
    
    function update(){
        $container.innerHTML = ''
        fetch('games')
            .then( x => x.json() )
            .then( games => games.forEach( game => {
                const $game = document.createElement( 'button' )
                const $label = document.createElement( 'h3' )
                $label.textContent = `${ game.name }`
                $game.appendChild( $label )
                const $players = document.createElement( 'p' )
                $players.textContent = ( game.players.length )
                    ?( `${ game.players.join(', ') }` )
                    :( 'nobody' )                
                $game.appendChild( $players )
                $game.onclick = () => on.gameSelected( game.name )
                $container.appendChild( $game )
            }))
        
    }
    return { $container, update, on }
}
