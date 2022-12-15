function addtocart(proID) {
    console.log('worked');
    $.ajax({
        url: '/addtocart/' + proID,
        method: 'get',

        success: (response) => {
            if (response.status) {
                let count = $('#cart-Count').html()
                count = parseInt(count) + 1
                $("#cart-Count").html(count)
            }

        }
    })
}