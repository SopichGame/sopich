export function Water( { w, hmin, hmax } ){
    const h = ( hmin + hmax  ) /2
    return {
        zeroAt : () => 0,
        heightAt : () => h,
        getDimensions : () => ({ w, h })
    }
}
