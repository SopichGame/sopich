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
                const $options = document.createElement( 'p' )
                //$options.textContent
                // if ( game.options ){
                //     const $optionItems = Object.entries( game.options )
                //           .map( ([name,value] )=> {
                //               const $option = document.createElement( 'article' )
                //               const $name = document.createElement( 'span' )
                //               $name.textContent = name
                //               $option.appendChild( $name )
                //               const $value = document.createElement( 'span' )
                //               $value.textContent = value
                //               $option.appendChild( $value )
                //               return $option
                //           })
                //     $optionItems.forEach( $option => $options.appendChild( $option ) )
                // }
                $game.appendChild( $options )
                $game.onclick = () => on.gameSelected( game.name )
                $container.appendChild( $game )
            }))
        
    }
    return { $container, update, on }
}
