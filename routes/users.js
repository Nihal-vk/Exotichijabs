const { response } = require('express');
var express = require('express');
const collection = require('../config/collection');
const adminhelpers = require('../helpers/adminhelpers');
const producthelpers = require('../helpers/producthelpers');
var router = express.Router();
const userhelpers = require('../helpers/userhelpers')

const paypal = require('paypal-rest-sdk')

paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': 'AbwK80Hz9S9DMFRWnx27gk_HnH5Yp79LsgcIH4cPbVikKVr2dPW8olkNdpXhDsY6IvLuqii0mfx9abgD', // please provide your client id here 
  'client_secret': 'EGe2sWEI99Qa1E3ODykn-5URZNLfu5HvfZfnMIkGphkBPYLCfRIUnV3TQY2UQnCgYdLXZRVd0GE1i1di' // provide your client secret here 
});


 //============================== Login =======================================

const verifyUser = (req, res, next) => {
  if (req.session.user) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }

  let category = await producthelpers.GetallCategory(req.body)
  userhelpers.displayProducts().then((products) => {
    res.render('user/index', { admin: false, user, products, category, cartCount });
  })

});

router.get('/login', (req, res) => {
  let user = req.session.user
  if (user) {
    res.redirect('/');
  } else {
    res.render('user/Login', { passwordErr: req.session.loginErr, blockedErr: req.session.loginBlocked });
    req.session.loginErr = null
    req.session.loginBlocked = null
  }

});

router.get('/signup', (req, res) => {
  res.render('user/signup', { signupError: req.session.Err, Emailerr: req.session.Emailerr })
  req.session.Err = null
  req.session.Emailerr = null
});


router.post('/signup', (req, res) => {
  console.log(req.body);
  if (req.body.password === req.body.confirmpassword) {
    console.log(req.body);
    userhelpers.doSignup(req.body).then(() => {
      res.redirect('/login')
    }).catch((error) => {
      req.session.Emailerr = error
      res.redirect('/signup');
    })
  } else {
    req.session.Err = 'password must be same'
    res.redirect('/signup');
  }
});


router.post('/login', (req, res) => {
  userhelpers.doLogin(req.body).then((response) => {
    console.log('hi');
    console.log(response);
    if (response.status) {
      userhelpers.isLogin(response.user._id).then(() => {
        if (response.status) {
          req.session.loggedIn = true
          req.session.user = response.user
          res.redirect('/');
        }
      }).catch((error) => {
        req.session.loginBlocked = error
        res.redirect('/login');
      })
    } else {
      req.session.loginErr = 'invalid credintials'
      res.redirect('/login');
    }
  })
});


router.get('/otp-login', (req, res) => {
  res.render('user/otplogin')
})


router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/cart')
})

// =============================Category======================

router.get('/view-category/:id', async (req, res) => {
  let user = req.session.user

  let category = await producthelpers.GetallCategory(req.body)
  userhelpers.getCategoryproducts(req.params.id).then((product) => {
    console.log(product);
    res.render('user/shop', { admin: false, user, product, category })
  })
});


// =============================product details page======================

router.get('/productDetails/:id', verifyUser, async (req, res) => {
  let user = req.session.user
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }
  let category = await producthelpers.GetallCategory(req.body)
  userhelpers.productDetails(req.params.id).then((product) => {
    res.render('user/products-details', { admin: false, user, product, category, cartCount })
  })

});


// =============================Cart======================

router.get('/cart', verifyUser, async (req, res) => {
  let user = req.session.user
  let products = await userhelpers.getcartProducts(req.session.user._id)
  
  if (products.length > 0) {
    let total = await userhelpers.getTotalprice(req.session.user._id)
    res.render('user/cart', { 'user': req.session.user._id, products, total })

  }
  else
    res.render('user/cart', { 'user': req.session.user._id, products })

});


router.get('/addtocart/:id', (req, res) => {

  userhelpers.addtoCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
});

router.post('/change-productQuantity', (req, res) => {

  userhelpers.changeproductQuantity(req.body).then(async (response) => {
    response.total = await userhelpers.getTotalprice(req.body.user)
    res.json(response)
  })
})

router.post('/delete-cartProduct', (req, res) => {
  let cartProid = req.body

  console.log(cartProid);
  userhelpers.deletecartProduct(cartProid).then((response) => {
    res.json(response)

  })
});


// =============================CheckOut======================

router.get('/proceedTo-checkout', verifyUser, async (req, res) => {
  let user = req.session.user
  let coupon=await producthelpers.getAllCoupons()
  let address = await userhelpers.getAlladdress(req.session.user._id)
  let total = await userhelpers.getTotalprice(req.session.user._id)
  let wallet=await userhelpers.getWallet(req.session.user._id)
  if(wallet.amount>total){
    walletview=true
  }else{
    walletview=false
  }
  res.render('user/placeorder', { total, user, address,coupon ,coupErr: req.session.couponErr,walletview,wallet});
  req.session.couponErr=null
});

router.post('/checkout', verifyUser, async (req, res) => {
  if (req.body.flexRadioDefault == "new") {
    await userhelpers.addAddressfromOrder(req.body, req.session.user)
  }
  let products = await userhelpers.getcartProductlist(req.body.userId)
  let totalprice = await userhelpers.getTotalprice(req.body.userId)
  let userid=req.body.userId
  console.log(req.body ,'hey mwolu');
  if(req.body.couponName){
    console.log('api callllll');
    totalprice = await userhelpers.getTotalprice(req.body.userId)
    let discountPrice=await userhelpers.promoOffer(req.body.couponName,totalprice)
    totalprice=totalprice-discountPrice

  }else{
    totalprice = await userhelpers.getTotalprice(req.body.userId)
  }

  console.log(products);

  let address = {}
  if (req.body.flexRadioDefault == 'new') {
    address = req.body
  }
  else {
    await userhelpers.getUserAddress(req.session.user, req.body.flexRadioDefault).then((address1) => {
      address = address1
    })
  }

  await userhelpers.placeOrder(req.body, address, products, totalprice).then(async (orderId) => {
    if (req.body['paymentMethod'] == 'COD') {
      res.json({ COD_success: true })
    }
    else if (req.body['paymentMethod'] == 'razorpay') {
      console.log('api call');
      await userhelpers.generateRazorpay(orderId, totalprice).then((response) => {
        response.razorpayMethod = true
        res.json(response)
      })
    }
    else if (req.body['paymentMethod'] == 'paypal') {
      console.log('hey paypal');

      var payment = {
        "intent": "authorize",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": "http://127.0.0.1:3000/orderplaced",
          "cancel_url": "http://127.0.0.1:3000/err"
        },
        "transactions": [{
          "amount": {
            "total": totalprice,
            "currency": "USD"
          },
          "description": " a book on mean stack "
        }]
      }

      userhelpers.createPay(payment).then((transaction) => {
        var id = transaction.id;
        var links = transaction.links;
        var counter = links.length;
        while (counter--) {
          if (links[counter].method == 'REDIRECT') {
            // redirect to paypal where user approves the transaction 
            // return res.redirect( links[counter].href )
            transaction.readytoredirect = true
            transaction.redirectLink = links[counter].href
            transaction.orderId = orderId


            userhelpers.changePaymentstatus(orderId).then(() => {
              res.json(transaction)

              console.log(transaction, 'hey transaction');
            })
          }
        }

      })
    }else if (req.body['paymentMethod'] == 'wallet'){
      userhelpers.useWallet(userid,totalprice)
      console.log(userid,totalprice,'nananna');
      res.json({ COD_success: true })
    }

  })
})

router.get('/err', (req, res) => {
  res.render('user/err')
})

router.post('/verify-payment', (req, res) => {
  console.log(req.body, 'body');
  userhelpers.verifyPayment(req.body).then(() => {
    userhelpers.changePaymentstatus(req.body['order[receipt]']).then(() => {
      console.log();
      res.json({ status: true })
    })
  }).catch((err) => {
    res.json({ status: false })
  })
})

router.get('/delete-saveAddress/:id', verifyUser, (req, res) => {
  userhelpers.deleteAddress(req.params.id, req.session.user).then(() => {
    res.redirect('/proceedTo-checkout')
  })
})

router.get('/orderplaced', async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let user = req.session.user
  res.render('user/orderplaced', { category, user })
})



// =============================Orders List======================

router.get('/orders', verifyUser, async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let user = req.session.user
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }
  let orders = await userhelpers.getallOrders(req.session.user._id)
  res.render('user/orders', { user, orders, cartCount, category })
})

router.get('/view-orderedProducts/:id', verifyUser, async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let user = req.session.user
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }
  let products = await userhelpers.getOrderproducts(req.params.id)
  let order= await userhelpers.getOrder(req.params.id)
  console.log(order.status);
  if(order.status=='placed')
  {
    res.render('user/vieworderpro', { products, user, cartCount, category,order,placed:true })
  }
  else if(order.status=='shipped')
  {
    res.render('user/vieworderpro', { products, user, cartCount, category,order,shipped:true })
  }
  else if(order.status=='out for Delivery')
  {
    res.render('user/vieworderpro', { products, user, cartCount, category,order,delivered:true })
  }
  else if(order.status=='cancelled')
  {
    res.render('user/vieworderpro', { products, user, cartCount, category,order,cancelled:true })
  }
  else if(order.status=='Return requested')
  {
    res.render('user/vieworderpro', { products, user, cartCount, category,order,returned:true })
  }
});


router.get('/cancel-Order/:id', async (req, res) => {
  await userhelpers.cancelOrders(req.params.id).then(() => {
    res.redirect('/orders')
  })
})

router.get('/return-Order/:id',async(req,res)=>{
  await userhelpers.returnOrder(req.params.id).then(()=>{
    res.redirect('/orders')
  })
})

// ============================= Profile ======================

router.get('/profile', verifyUser, async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let user = req.session.user
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }
  let userDetails = await userhelpers.userDetails(req.session.user._id)
  let address = await userhelpers.getProfileaddress(req.session.user._id)
  let orders = await userhelpers.getallOrders(req.session.user._id)
  let wallet=await userhelpers.getWallet(req.session.user._id)
  userhelpers.getUserdetails(req.session.user._id).then((users) => {
    res.render('user/profile', { user, users, address, orders, cartCount, category, userDetails,wallet })
  })

})

router.post('/addAddress', async (req, res) => {
  console.log(req.body, 'hey adddress');
  userhelpers.addAddress(req.body, req.session.user)
  res.redirect('/profile')
})

router.get('/delete-address/:id', verifyUser, (req, res) => {
  userhelpers.deleteAddress(req.params.id, req.session.user).then(() => {
    res.redirect('/profile')
  })
})

router.post('/edit-user/:id', (req, res) => {
  userhelpers.updateUser(req.params.id, req.body).then(() => {
    res.redirect('/profile')
  })
})



// =============================WishList======================

router.get('/wishlist', verifyUser, async (req, res) => {
  let user = req.session.user
  if (user) {
    cartCount = await userhelpers.getcartCount(req.session.user._id)
  }
  let products = await userhelpers.getwishlistProducts(req.session.user._id)
  console.log(products, 'this is pro');
  res.render('user/wishlist', { user, products, cartCount })
})

router.get('/add-to-wishlist/:id', (req, res) => {
  console.log('api call');
  userhelpers.addtoWishlist(req.params.id, req.session.user._id).then(() => {
    res.redirect('/')
  })
})

router.post('/delete-wishPro', (req, res) => {
  userhelpers.deleteWishPro(req.body).then((response) => {
    res.json(response)
  })
})


// ============================= Coupon ======================

router.post('/couponApplied',(req,res)=>{
  console.log('api call',req.body);
  userhelpers.couponOffer(req.body).then((response)=>{
    if(response.couponErr==true){
      console.log('hi err');
      req.session.couponErr= `You want to purchase over ₹ ${response.couponmin}` 
    }if(response.couponErr1==true){
      console.log('hi1 err');
      req.session.couponErr='invalid Coupon'
    }
    res.json(response)
  })
})


// ============================= Error Page ======================

router.get('/err', (req, res) => {
  res.render('user/err')
})

//=====================================================================//

module.exports = router;



