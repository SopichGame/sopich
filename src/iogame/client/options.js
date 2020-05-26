export function Options( $container ) {
    const on = {}
    if ( ! $container ){
        $container = document.createElement( 'div' )
        $container.classList.add( 'options-list' )
    }    
    function update( name ){
        $container.innerHTML = ''

        const $h3 = document.createElement('h3')
        $h3.textContent = 'Options'
        $container.appendChild( $h3 )

        const $list = document.createElement( 'div' )
        $list.classList.add( 'options-list' )
        $container.appendChild( $list )
        
        fetch(`game/${name}/options`)
            .then( x => x.json() )
            .then( options => {
                const $optionItems = Object.entries( options )
                      .map( ([name,value] )=> {
                          const $name = document.createElement( 'span' )
                          $name.classList.add( 'option-name' )
                          $name.textContent = name
                          const $value = document.createElement( 'span' )
                          $value.classList.add( 'option-value' )
                          $value.textContent = value
                          return [ $name, $value ]
                      })
                $optionItems.forEach( $s => {
                    $s.forEach( $ => $list.appendChild( $ ) )
                })
            })
    }
    return { $container, update, on }
}
