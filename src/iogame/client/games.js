import { PlayerUCS } from './players.js'

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
                const $players = document.createElement( 'div' )
                $players.classList.add('games-list-game-players')

                
                Object.entries( game.players ).map( ([ name, props ]) => {
                    
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
